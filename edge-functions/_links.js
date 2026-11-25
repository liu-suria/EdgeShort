import {
  HttpError, errorResponse, makeCode, makeRecordId, normaliseCode, normaliseExpiry, normaliseTitle, normaliseUrl,
  isCodeShape, publicRecord, readJson,
} from "./_lib.js";
import {
  getLinkStore, getRecord, getVisitInfo, getVisits, listRecords, recordKey, saveNewRecord, saveRecord, setVisits, visitsKey,
} from "./_storage.js";
import { dropPendingVisits, invalidate } from "./_redirect.js";

const BAD_URL = "Enter a valid http:// or https:// destination URL";
const BAD_CODE = "Short code must be 1–16 letters, numbers, hyphens, or underscores, and cannot be reserved";
const SELF_LINK = "The destination cannot be a short link on this site (it would redirect in a loop)";
const BAD_EXPIRY = "Expiration must be a future date/time or a whole number of days from 1 to 36500";

// A destination on this very site that looks like a short code could loop
// back into the redirector, so it is refused.
function assertNotSelfLink(url, host) {
  const target = new URL(url);
  if (!host || target.host.toLowerCase() !== host.toLowerCase()) return;
  const segments = target.pathname.split("/").filter(Boolean);
  if (segments.length === 1 && isCodeShape(segments[0])) throw new HttpError(422, SELF_LINK);
}

function intParam(value, name, min, max, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new HttpError(422, `${name} must be a whole number from ${min} to ${max}`);
  return number;
}

// `params`: q (search), status (active|expired), limit, offset (from a URLSearchParams).
export async function listLinks(store, params, origin = "", defaultLimit = Infinity) {
  const needle = String(params.get("q") || "").trim().toLowerCase();
  const status = params.get("status");
  if (status && status !== "active" && status !== "expired") throw new HttpError(422, "status must be active or expired");
  const limit = intParam(params.get("limit"), "limit", 1, 500, defaultLimit);
  const offset = intParam(params.get("offset"), "offset", 0, 1_000_000, 0);
  const all = (await listRecords(store)).map((record) => publicRecord(record, origin));
  const filtered = all.filter((link) => (!status || link.status === status)
    && (!needle || [link.code, link.url, link.title].join(" ").toLowerCase().includes(needle)));
  const links = filtered.slice(offset, offset + limit);
  return { links, total: filtered.length, limit: Number.isFinite(limit) ? limit : null, offset, hasMore: offset + links.length < filtered.length };
}

export async function getLink(store, code, origin = "") {
  const record = await getRecord(store, code);
  if (!record) throw new HttpError(404, "Link not found");
  const visits = await getVisitInfo(store, record.code);
  return { link: publicRecord({ ...record, visits: (Number(record.visits) || 0) + visits.count, lastVisitAt: visits.at }, origin) };
}

export async function createLink(store, body, ctx = {}) {
  const url = normaliseUrl(body.url);
  if (!url) throw new HttpError(422, BAD_URL);
  assertNotSelfLink(url, ctx.host);
  const expiresAt = normaliseExpiry(body.expiresAt);
  if (expiresAt === undefined) throw new HttpError(422, BAD_EXPIRY);
  const requested = body.code ? normaliseCode(body.code) : null;
  if (body.code && !requested) throw new HttpError(422, BAD_CODE);
  const now = new Date().toISOString();
  const clearStaleCounter = (code) => store.delete(visitsKey(code)).catch(() => {});
  const build = (code) => ({ id: makeRecordId(), code, url, title: normaliseTitle(body.title), expiresAt, createdAt: now, updatedAt: now });
  if (requested) {
    const link = build(requested);
    if (!(await saveNewRecord(store, link))) throw new HttpError(409, "That short code is already in use");
    await clearStaleCounter(link.code);
    return { link: publicRecord({ ...link, visits: 0 }, ctx.origin) };
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const link = build(makeCode());
    if (await saveNewRecord(store, link)) {
      await clearStaleCounter(link.code);
      return { link: publicRecord({ ...link, visits: 0 }, ctx.origin) };
    }
  }
  throw new HttpError(503, "Could not allocate a short code. Please try again.");
}

// PATCH semantics: only the fields present in the body change.
export async function updateLink(store, code, body, ctx = {}) {
  const existing = await getRecord(store, code);
  if (!existing) throw new HttpError(404, "Link not found");
  const url = body.url === undefined ? existing.url : normaliseUrl(body.url);
  if (!url) throw new HttpError(422, BAD_URL);
  if (body.url !== undefined) assertNotSelfLink(url, ctx.host);
  const nextCode = body.code === undefined ? existing.code : normaliseCode(body.code);
  if (!nextCode) throw new HttpError(422, BAD_CODE);
  const expiresAt = body.expiresAt === undefined ? (existing.expiresAt || null) : normaliseExpiry(body.expiresAt);
  if (expiresAt === undefined) throw new HttpError(422, BAD_EXPIRY);
  const title = body.title === undefined ? (existing.title || "") : normaliseTitle(body.title);
  const link = { ...existing, code: nextCode, url, title, expiresAt, updatedAt: new Date().toISOString() };
  if (nextCode === existing.code) {
    await saveRecord(store, link);
  } else {
    // Blob keys are based on the short code. Create the new key first so a
    // failed rename never removes the existing short link, then carry the
    // visit counter over to the new code.
    // A previous attempt may have created the target and then failed. Resume it
    // (same record id) instead of reporting a conflict, and apply this request's fields.
    const target = await getRecord(store, nextCode);
    if (target?.id === existing.id) await saveRecord(store, link);
    else if (!(await saveNewRecord(store, link))) throw new HttpError(409, "That short code is already in use");
    const moved = Math.max(await getVisits(store, existing.code), await getVisits(store, nextCode));
    if (moved) await setVisits(store, nextCode, moved);
    await store.delete(recordKey(existing.code));
    await store.delete(visitsKey(existing.code));
    dropPendingVisits(existing.code);
    invalidate(existing.code);
  }
  invalidate(nextCode);
  const visits = await getVisitInfo(store, nextCode);
  return { link: publicRecord({ ...link, visits: (Number(link.visits) || 0) + visits.count, lastVisitAt: visits.at }, ctx.origin) };
}

export async function deleteLink(store, code) {
  if (!(await getRecord(store, code))) throw new HttpError(404, "Link not found");
  // Record first: once it is gone the link is dead, and a leftover counter is
  // harmless (createLink clears stale counters for a reused code).
  await store.delete(recordKey(code));
  await store.delete(visitsKey(code)).catch(() => {});
  dropPendingVisits(code);
  invalidate(code);
}

// Builds the five link handlers for a given auth guard and response helper, so
// the admin API and the public API share one implementation.
export function linkHandlers(authorise, respond, { defaultLimit = Infinity } = {}) {
  const guarded = (fallback, run) => async (context) => {
    const auth = await authorise(context);
    if (auth.response) return auth.response;
    try {
      const url = new URL(context.request.url);
      return await run(context, getLinkStore(), { origin: url.origin, host: url.host, params: url.searchParams });
    } catch (error) {
      return errorResponse(error, respond, fallback);
    }
  };
  return {
    list: guarded("Unable to load links", async (context, store, ctx) => (
      respond(await listLinks(store, ctx.params, ctx.origin, defaultLimit))
    )),
    create: guarded("Unable to create link", async (context, store, ctx) => (
      respond(await createLink(store, await readJson(context.request), ctx), 201)
    )),
    get: guarded("Unable to load link", async (context, store, ctx) => respond(await getLink(store, context.params?.code, ctx.origin))),
    update: guarded("Unable to update link", async (context, store, ctx) => (
      respond(await updateLink(store, context.params?.code, await readJson(context.request), ctx))
    )),
    remove: guarded("Unable to delete link", async (context, store) => {
      await deleteLink(store, context.params?.code);
      return respond(null, 204);
    }),
  };
}
