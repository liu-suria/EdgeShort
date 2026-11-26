import { listLinks } from "./_link-page.js";
export { listLinks };
import { isBrandRoute, isPlatformRoute } from "./_destinations.js";
import { visitId } from "./_visit-shards.js";
import { domainRegistry, publishedLink } from "./_domains.js";
import { requireGroupAccess } from "./_accounts.js";
import {
  HttpError, errorResponse, makeCode, makeRecordId, normaliseCode, normaliseExpiry, normaliseTitle, normaliseUrl,
  isGroupName, linkPath, publicRecord, readJson, routeLinkPath, splitLinkPath,
} from "./_lib.js";
import {
  getLinkStore, getRecord, getVisitInfo, getVisits, recordKey, saveNewRecord, saveRecord, setVisits, visitsKey,
} from "./_storage.js";
import { invalidate } from "./_redirect.js";

import { withRouteLocks } from "./_route-lock.js";

const BAD_URL = "Enter a valid http:// or https:// destination URL";
const BAD_CODE = "Short code must be 1–16 letters, numbers, hyphens, or underscores, and cannot be reserved";
const SELF_LINK = "The destination cannot be a short link on this site (it would redirect in a loop)";
const BAD_EXPIRY = "Expiration must be a future date/time or a whole number of days from 1 to 36500";

async function assertNotSelfLink(store, url, host) {
  const target = new URL(url);
  if (isPlatformRoute(target, host)) throw new HttpError(422, SELF_LINK);
  const domains = await domainRegistry(store);
  if (domains.some(row => row.status === "active" && isBrandRoute(target, row.hostname))) {
    throw new HttpError(422, SELF_LINK);
  }
}

async function linkResult(store, record, origin) {
  const link = publicRecord(record, origin);
  return { link: link.group ? publishedLink(link, await domainRegistry(store), origin) : link };
}

export async function getLink(store, code, origin = "") {
  const record = await getRecord(store, code);
  if (!record?.url) throw new HttpError(404, "Link not found");
  const visits = await getVisitInfo(store, record);
  return linkResult(store, { ...record, visits: (Number(record.visits) || 0) + visits.count, lastVisitAt: visits.at }, origin);
}

async function selectedGroup(store, group) {
  if (group == null || group === "") return "";
  if (!isGroupName(group)) throw new HttpError(422, "Invalid group name");
  if ((await getRecord(store, group))?.kind !== "group") {
    throw new HttpError(422, "Create the group before adding a link");
  }
  return group;
}

export async function createLink(store, body, ctx = {}) {
  const url = normaliseUrl(body.url);
  if (!url) throw new HttpError(422, BAD_URL);
  await assertNotSelfLink(store, url, ctx.host);
  const expiresAt = normaliseExpiry(body.expiresAt);
  if (expiresAt === undefined) throw new HttpError(422, BAD_EXPIRY);
  const group = await selectedGroup(store, body.group);
  const requested = body.code ? normaliseCode(body.code) : null;
  if (body.code && !requested) throw new HttpError(422, BAD_CODE);
  const now = new Date().toISOString();
  const clearStaleCounter = (code) => store.delete(visitsKey(code)).catch(() => {});
  const build = (code) => ({ id: makeRecordId(), code: linkPath(group, code), url, title: normaliseTitle(body.title), expiresAt, createdAt: now, updatedAt: now });
  if (requested) {
    const link = build(requested);
    if (!(await saveNewRecord(store, link))) throw new HttpError(409, "That short code is already in use");
    await Promise.all([clearStaleCounter(link.code), invalidate(link.code, ctx.origin)]);
    return linkResult(store, { ...link, visits: 0 }, ctx.origin);
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const link = build(makeCode());
    if (await saveNewRecord(store, link)) {
      await Promise.all([clearStaleCounter(link.code), invalidate(link.code, ctx.origin)]);
      return linkResult(store, { ...link, visits: 0 }, ctx.origin);
    }
  }
  throw new HttpError(503, "Could not allocate a short code. Please try again.");
}

// PATCH semantics: only the fields present in the body change.
export async function updateLink(store, code, body, ctx = {}) {
  const existing = await getRecord(store, code);
  if (!existing?.url) throw new HttpError(404, "Link not found");
  const url = body.url === undefined ? existing.url : normaliseUrl(body.url);
  if (!url) throw new HttpError(422, BAD_URL);
  if (body.url !== undefined) await assertNotSelfLink(store, url, ctx.host);
  const current = splitLinkPath(existing.code);
  const shortCode = body.code === undefined ? current.code : normaliseCode(body.code);
  if (!shortCode) throw new HttpError(422, BAD_CODE);
  const group = body.group === undefined ? current.group : await selectedGroup(store, body.group);
  const nextCode = linkPath(group, shortCode);
  const expiresAt = body.expiresAt === undefined ? (existing.expiresAt || null) : normaliseExpiry(body.expiresAt);
  if (expiresAt === undefined) throw new HttpError(422, BAD_EXPIRY);
  const title = body.title === undefined ? (existing.title || "") : normaliseTitle(body.title);
  const link = { ...existing, id: visitId(existing), code: nextCode, url, title, expiresAt, updatedAt: new Date().toISOString() };
  if (nextCode !== existing.code) await guardDefault(store, existing.code);
  if (nextCode === existing.code) {
    await saveRecord(store, link);
  } else {
    // Blob keys are based on the short code. Create the new key first so a
    // failed rename never removes the existing short link, then carry the
    // visit counter over to the new code.
    // A previous attempt may have created the target and then failed. Resume it
    // (same record id) instead of reporting a conflict, and apply this request's fields.
    const target = await getRecord(store, nextCode);
    if (target && visitId(target) === link.id) await saveRecord(store, link);
    else if (!(await saveNewRecord(store, link))) throw new HttpError(409, "That short code is already in use");
    const moved = Math.max(await getVisits(store, existing.code), await getVisits(store, nextCode));
    if (moved) await setVisits(store, nextCode, moved);
    await store.delete(recordKey(existing.code));
    await store.delete(visitsKey(existing.code));
    await invalidate(existing.code, ctx.origin);
  }
  await invalidate(nextCode, ctx.origin);
  if (group) await invalidate(group, ctx.origin);
  const visits = await getVisitInfo(store, link);
  return linkResult(store, { ...link, visits: (Number(link.visits) || 0) + visits.count, lastVisitAt: visits.at }, ctx.origin);
}

async function guardDefault(store, path) {
  const { group, code } = splitLinkPath(path);
  if (group && (await getRecord(store, group))?.defaultCode === code) {
    throw new HttpError(409, "先切换或清空组默认，再删除、移动或重命名该成员");
  }
}

export async function deleteLink(store, code, ctx = {}) {
  if (!(await getRecord(store, code))?.url) throw new HttpError(404, "Link not found");
  await guardDefault(store, code);
  // Record first: once it is gone the link is dead, and a leftover counter is
  // harmless (createLink clears stale counters for a reused code).
  await store.delete(recordKey(code));
  await store.delete(visitsKey(code)).catch(() => {});
  await invalidate(code, ctx.origin);
}

// Builds the five link handlers for a given auth guard and response helper, so
// the admin API and the public API share one implementation.
export function linkHandlers(authorise, respond, { defaultLimit = Infinity, includeGroups = false } = {}) {
  const guarded = (fallback, run) => async (context) => {
    const auth = await authorise(context);
    if (auth.response) return auth.response;
    try {
      const url = new URL(context.request.url);
      if (context.params?.code !== undefined) requireGroupAccess(auth.user, context.params.group);
      if (url.searchParams.has("group")) requireGroupAccess(auth.user, url.searchParams.get("group"));
      return await run(context, getLinkStore(), { user: auth.user, origin: url.origin, host: url.host, params: url.searchParams });
    } catch (error) {
      return errorResponse(error, respond, fallback);
    }
  };
  return {
    list: guarded("Unable to load links", async (context, store, ctx) => (
      respond(await listLinks(store, ctx.params, ctx.origin, defaultLimit, includeGroups, ctx.user.role === "admin" ? undefined : ctx.user.groups))
    )),
    create: guarded("Unable to create link", async (context, store, ctx) => {
      const body = await readJson(context.request);
      requireGroupAccess(ctx.user, body.group);
      return withRouteLocks(store, [body.group || normaliseCode(body.code)], async () =>
        respond(await createLink(store, body, ctx), 201));
    }),
    get: guarded("Unable to load link", async (context, store, ctx) => respond(await getLink(store, routeLinkPath(context.params), ctx.origin))),
    update: guarded("Unable to update link", async (context, store, ctx) => {
      const path = routeLinkPath(context.params);
      if (!path) throw new HttpError(404, "Link not found");
      const body = await readJson(context.request);
      const current = splitLinkPath(path);
      const newGroup = body.group === undefined ? current.group : body.group;
      requireGroupAccess(ctx.user, newGroup);
      return withRouteLocks(store, [current.group || current.code, newGroup || normaliseCode(body.code) || current.code], async () =>
        respond(await updateLink(store, path, body, ctx)));
    }),
    remove: guarded("Unable to delete link", async (context, store, ctx) => {
      const path = routeLinkPath(context.params);
      if (!path) throw new HttpError(404, "Link not found");
      await withRouteLocks(store, [path.split("/")[0]], () => deleteLink(store, path, ctx));
      return respond(null, 204);
    }),
  };
}
