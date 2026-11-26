import { liveIdentity, requireAuth } from "./_accounts.js";
import { getInstallation } from "./_installation.js";
import { isPlatformHost } from "./_domain-names.js";
import { apiKeyKey, getLinkStore } from "./_storage.js";
import { clientIp, hashSecret, json, makeApiKey, makeApiKeyId, readJson, timingSafeEqual, toBase64Url } from "./_lib.js";

const lifetime = 300_000;
const interval = 5;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const strong = { type: "json", consistency: "strong" };
const bucket = () => Math.floor(Date.now() / lifetime);
const prefix = (slot) => "device-pairs/" + String(slot).padStart(12, "0") + "/";
const reject = (error, status = 400) => json({ error }, status);
const codeShape = /^[A-HJ-NP-Z2-9]{8}$/;

async function insert(store, key, value) {
  try {
    await store.setJSON(key, value, { onlyIfNew: true });
    return true;
  } catch (error) {
    if (error?.code === "PRECONDITION_FAILED") return false;
    throw error;
  }
}

// Use atomic tickets per IP and five-minute window, including across isolates.
async function allow(store, slot, ip, operation, maximum) {
  const base = prefix(slot) + "limit-" + operation + "-" + (await hashSecret(ip)).slice(0, 24) + "-";
  for (let n = 0; n < maximum; n++) if (await insert(store, base + n, true)) return true;
  return false;
}

async function prune(store) {
  const cutoff = prefix(bucket() - 1);
  const page = await store.list({
    prefix: "device-pairs/",
    limit: 32,
    paginate: false,
    consistency: "strong",
  });
  await Promise.all(page.blobs.filter((item) => item.key < cutoff).map((item) => store.delete(item.key)));
}

function normalizeCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/[-\s]/g, "") : "";
}

async function lookup(store, code) {
  if (!codeShape.test(code)) return null;
  const now = bucket();
  const slot = [now, now - 1].find((n) => alphabet[n % 32] === code[0]);
  if (slot === undefined) return null;
  const path = prefix(slot) + code;
  const request = await store.get(path, strong);
  return request && Date.now() < request.expires ? { path, request } : null;
}

async function start(store, context, body) {
  if (!(await getInstallation(store))) return reject("setup_required", 409);
  if (
    typeof body.clientName !== "string" ||
    !body.clientName.trim() ||
    body.clientName.length > 64 ||
    /[\x00-\x1f\x7f]/u.test(body.clientName)
  )
    return reject("invalid_client_name");
  const slot = bucket();
  if (!(await allow(store, slot, clientIp(context.request), "start", 6))) return reject("slow_down", 429);
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  const code = alphabet[slot % 32] + Array.from(bytes, (n) => alphabet[n % 32]).join("");
  const proof = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const id = makeApiKeyId();
  const request = {
    clientName: body.clientName.trim(),
    proofHash: await hashSecret(proof),
    id,
    expires: Date.now() + lifetime,
  };
  if (!(await insert(store, prefix(slot) + code, request))) return reject("try_again", 409);
  const cleanup = prune(store).catch(() => {});
  if (context.waitUntil) context.waitUntil(cleanup);
  else await cleanup;
  return json(
    {
      user_code: code.slice(0, 4) + "-" + code.slice(4),
      device_code: code + "." + proof,
      verification_uri: new URL("/admin/?connect=device", context.request.url).href,
      expires_in: lifetime / 1000,
      interval,
    },
    201,
  );
}

async function inspectOrDecide(store, context, body, user) {
  const code = normalizeCode(body.user_code);
  const pair = await lookup(store, code);
  if (!pair) {
    if (!(await allow(store, bucket(), user.owner ?? user.username, "invalid", 8)))
      return reject("slow_down", 429);
    return reject("invalid_or_expired_code", 404);
  }
  const decisionKey = pair.path + ".decision";
  const display = {
    pairId: pair.request.id,
    clientName: pair.request.clientName,
    expiresAt: new Date(pair.request.expires).toISOString(),
    username: user.username,
    role: user.role,
    groups: user.groups ?? [],
  };
  if (body.action === "inspect") {
    if (await store.get(decisionKey, strong)) return reject("already_decided", 409);
    return json(display);
  }
  if (!["approve", "deny"].includes(body.action)) return reject("invalid_action");
  if (body.pairId !== pair.request.id) return reject("lookup_again", 409);
  if (!(await insert(store, decisionKey, { action: body.action, owner: user.owner ?? user.username })))
    return reject("already_decided", 409);
  return json({ status: body.action === "approve" ? "approved" : "denied" });
}

async function exchange(store, body) {
  const match =
    typeof body.device_code === "string" &&
    /^([A-HJ-NP-Z2-9]{8})\.([A-Za-z0-9_-]{43})$/.exec(body.device_code);
  const pair = match && (await lookup(store, match[1]));
  if (!pair || !timingSafeEqual(await hashSecret(match[2]), pair.request.proofHash))
    return reject("invalid_or_expired_device");
  const decision = await store.get(pair.path + ".decision", strong);
  if (!decision) return reject("authorization_pending");
  if (decision.action !== "approve" || !(await liveIdentity(store, decision.owner)))
    return reject("access_denied", 403);
  if (Date.now() >= pair.request.expires) return reject("expired_token");
  const id = pair.request.id;
  const { value } = makeApiKey(id);
  const record = {
    id,
    owner: decision.owner,
    source: "device",
    name: pair.request.clientName,
    prefix: value.slice(0, 12),
    hash: await hashSecret(value),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };
  // This insert IS redemption: simultaneous polls cannot create two credentials
  // and a later poll cannot revive a revoked key.
  if (!(await insert(store, apiKeyKey(id), record))) return reject("already_redeemed", 409);
  return json({ access_token: value, token_type: "Bearer", key_id: id });
}

export function deviceHandler(operation) {
  return async (context) => {
    const { request } = context,
      url = new URL(request.url);
    if (
      !isPlatformHost(url.hostname) ||
      (request.headers.has("Origin") && request.headers.get("Origin") !== url.origin)
    )
      return reject("origin_denied", 403);
    if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      return reject("expected_json", 415);
    try {
      const store = getLinkStore();
      if (operation === "authorize") {
        const auth = await requireAuth(context);
        if (auth.response) return auth.response;
        return await inspectOrDecide(store, context, await readJson(request), auth.user);
      }
      const body = await readJson(request);
      return operation === "start" ? await start(store, context, body) : await exchange(store, body);
    } catch (error) {
      return reject(error.status ? "invalid_request" : "temporarily_unavailable", error.status || 503);
    }
  };
}
