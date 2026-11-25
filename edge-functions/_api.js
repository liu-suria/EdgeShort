import { API_KEY_FORMAT, hashSecret, json, timingSafeEqual } from "./_lib.js";
import { getApiKey, getLinkStore, listApiKeys, usageKey } from "./_storage.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
const USAGE_WRITE_GAP_MS = 10 * 60_000;
const lastUsageWrite = new Map();

export function apiJson(data, status = 200, headers = {}) {
  return json(data, status, { ...CORS_HEADERS, ...headers });
}

export function apiOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function apiToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  return bearer || request.headers.get("X-API-Key") || "";
}

async function findKey(store, token) {
  const tokenHash = await hashSecret(token);
  const match = (candidate) => candidate && !candidate.revokedAt && typeof candidate.hash === "string" && timingSafeEqual(candidate.hash, tokenHash);
  const id = token.match(API_KEY_FORMAT)?.[1];
  if (id) {
    const key = await getApiKey(store, id);
    return match(key) ? key : null;
  }
  // Keys issued before ids were embedded in the token: fall back to a scan.
  return (await listApiKeys(store)).find(match) || null;
}

// lastUsedAt goes to its own blob and is throttled, so authenticating never
// rewrites (and can never clobber) the key record itself.
function touchUsage(store, id, waitUntil) {
  const now = Date.now();
  if (now - (lastUsageWrite.get(id) || 0) < USAGE_WRITE_GAP_MS) return;
  if (lastUsageWrite.size > 200) lastUsageWrite.clear();
  lastUsageWrite.set(id, now);
  const task = store.setJSON(usageKey(id), { at: new Date(now).toISOString() }).catch(() => {});
  if (typeof waitUntil === "function") waitUntil(task);
}

export async function requireApiKey(context) {
  const token = apiToken(context.request);
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return { response: apiJson({ error: "A valid API key is required" }, 401, { "WWW-Authenticate": "Bearer" }) };
  }
  try {
    const store = getLinkStore();
    const key = await findKey(store, token);
    if (!key) return { response: apiJson({ error: "A valid API key is required" }, 401, { "WWW-Authenticate": "Bearer" }) };
    touchUsage(store, key.id, context.waitUntil?.bind(context));
    return { store, key };
  } catch (error) {
    console.error("api auth failed", error);
    return { response: apiJson({ error: "API authentication is temporarily unavailable" }, 503) };
  }
}
