import { HttpError, hashSecret, publicGroup, publicRecord } from "./_lib.js";
import { withVisitCounts, listGroups, mapLimit } from "./_storage.js";
import { domainRegistry, publishedGroup, publishedLink } from "./_domains.js";

function numberParam(params, name, fallback, min, max) {
  if (!params.has(name)) return fallback;
  const n = Number(params.get(name));
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new HttpError(422, "Invalid " + name);
  return n;
}

function resume(token, scope, count) {
  if (!token) return { i: 0, marker: "" };
  try {
    const [signature, i, marker] = JSON.parse(atob(token));
    if (signature === scope && Number.isInteger(i) && i >= 0 && i < count && typeof marker === "string") return { i, marker };
  } catch { /* invalid cursor */ }
  throw new HttpError(422, "Cursor does not match this query; start a new page");
}

// The SDK applies prefix and native continuation before downloading object bodies.
// Only the selected rows have visit counters hydrated. An explicit offset asks for
// the exact total and consequently scans the rest of the authorized mappings.
export async function listLinks(store, params, origin = "", defaultLimit = 100, includeGroups = false, allowedGroups) {
  const limit = numberParam(params, "limit", Math.min(defaultLimit, 100), 1, 500);
  const offset = numberParam(params, "offset", 0, 0, 1000000);
  const exact = params.has("offset");
  if (exact && params.has("cursor")) throw new HttpError(422, "Use cursor or offset");
  const group = params.get("group");
  if (group !== null && allowedGroups && !allowedGroups.includes(group)) throw new HttpError(403, "Group not allowed");
  const needle = (params.get("q") || "").trim().toLowerCase();
  const status = params.get("status");
  if (status && !["active", "expired"].includes(status)) throw new HttpError(422, "Invalid status");
  const scopes = group !== null ? [group] : allowedGroups ? [...allowedGroups].sort() : [null];
  const scope = await hashSecret(JSON.stringify([scopes, needle, status]));
  let { i, marker } = resume(params.get("cursor"), scope, scopes.length);
  let examined = 0, matched = 0;
  const records = [];
  const budget = Math.max(200, limit * 2);
  while (i < scopes.length && (exact || (records.length < limit && examined < budget))) {
    const name = scopes[i];
    const size = exact ? 100 : Math.min(64, limit - records.length, budget - examined);
    const page = await store.list({ prefix: "links/" + (name ? name + "~" : ""), limit: size,
      cursor: marker || undefined, paginate: false, consistency: "strong" });
    examined += page.blobs.length;
    const keys = page.blobs.filter(item => name !== "" || !item.key.includes("~"));
    const rows = await mapLimit(keys, 25, item => store.get(item.key, { type: "json", consistency: "strong" }));
    for (const record of rows) {
      if (!record?.url) continue;
      if (needle && ![record.code, record.url, record.title].join(" ").toLowerCase().includes(needle)) continue;
      const expired = Boolean(record.expiresAt && Date.parse(record.expiresAt) <= Date.now());
      if (status && (status === "expired") !== expired) continue;
      if (matched++ >= offset && records.length < limit) records.push(record);
    }
    if (page.cursor) {
      if (marker === page.cursor) throw new Error("Storage cursor did not advance");
      marker = page.cursor;
    } else { i++; marker = ""; }
  }
  const domains = await domainRegistry(store);
  const hydrated = await withVisitCounts(store, records);
  const links = hydrated.map(record => publishedLink(publicRecord(record, origin), domains, origin));
  const groups = includeGroups ? (await listGroups(store, allowedGroups)).map(row =>
    publishedGroup(publicGroup(row, origin), domains, origin, allowedGroups === undefined)) : undefined;
  const more = i < scopes.length;
  return { links, groups, limit, offset, total: exact || (!more && !params.get("cursor")) ? matched : null,
    nextCursor: more ? btoa(JSON.stringify([scope, i, marker])) : null, hasMore: exact ? offset + links.length < matched : more };
}
