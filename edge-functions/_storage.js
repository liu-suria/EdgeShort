import { visitId, shardPrefix } from "./_visit-shards.js";
import { getStore } from "@edgeone/pages-blob";
import { isLinkPath } from "./_lib.js";

const STORE_NAME = "edgeshort-links";
const READ_CONCURRENCY = 25;

let factory = () => getStore(STORE_NAME);
let instance = null;

export function getLinkStore() {
  // Makers creates this Blob namespace automatically on its first use. No
  // dashboard binding or storage credential is needed inside an Edge Function.
  return (instance ||= factory());
}

// Test hook: lets unit tests swap in an in-memory store.
export function setStoreFactory(next) {
  factory = next;
  instance = null;
}

// Link config and visit counters live in separate blobs on purpose: the counter
// is a read-modify-write that cannot be atomic, so it must never share a record
// with data that an admin edit could overwrite.
export const recordKey = (code) => `links/${code.replace("/", "~")}.json`;
export const visitsKey = (code) => `visits/${code.replace("/", "~")}.json`;
export const apiKeyKey = (id) => `api-keys/${id}.json`;
export const usageKey = (id) => `api-key-usage/${id}.json`;
export const rateKey = (id) => `ratelimit/${id}.json`;

const asObject = (value) => (value && typeof value === "object" ? value : null);

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function listKeys(store, prefix, max) {
  const { blobs = [] } = await store.list({ prefix, consistency: "strong" });
  if (blobs.length > max) throw new Error(`Too many entries under ${prefix}`);
  return blobs.map(({ key }) => key);
}

// Domain activation is rare; inspect mappings in bounded batches and stop on a match.
export async function hasLinkMatching(store, predicate) {
  const keys = await listKeys(store, "links/", Infinity);
  for (let i = 0; i < keys.length; i += READ_CONCURRENCY) {
    const records = await Promise.all(keys.slice(i, i + READ_CONCURRENCY).map(key => store.get(key, { type: "json", consistency: "strong" })));
    if (records.some(link => link?.url && predicate(link))) return true;
  }
  return false;
}

export async function getRecord(store, code, consistency = "strong") {
  // Reject junk paths (scanners, favicon.ico, ...) without touching storage.
  if (!isLinkPath(code)) return null;
  return asObject(await store.get(recordKey(code), { type: "json", consistency }));
}

// The SDK throws PRECONDITION_FAILED when an onlyIfNew write finds the key taken.
// Treat that as "not created", and as success if the existing record is ours
// (which makes a retried rename idempotent).
async function writeIfNew(store, key, record) {
  try {
    await store.setJSON(key, record, { onlyIfNew: true });
    return true;
  } catch (error) {
    if (error?.code !== "PRECONDITION_FAILED") throw error;
    return false;
  }
}

export async function saveNewRecord(store, record) {
  if (await writeIfNew(store, recordKey(record.code), record)) return true;
  const saved = await getRecord(store, record.code);
  return saved?.id === record.id;
}

export async function saveRecord(store, record) {
  await store.setJSON(recordKey(record.code), record);
}

async function legacyCounter(store, code) {
  const value = asObject(await store.get(visitsKey(code), { type: "json", consistency: "strong" }));
  return { count: Number(value?.count) || 0, at: value?.at || null };
}

export async function getVisits(store, code) {
  return (await legacyCounter(store, code)).count;
}

export async function setVisits(store, code, count) {
  await store.setJSON(visitsKey(code), { count, at: new Date().toISOString() });
}

function combineCounts(left, right) {
  const at = [left?.at, right?.at].filter(Boolean).sort().at(-1) || null;
  return { count: (Number(left?.count) || 0) + (Number(right?.count) || 0), at };
}

async function loadShardTotals(store, records, concurrency = READ_CONCURRENCY) {
  const ids = [...new Set(records.filter(row => row?.url).map(visitId))];
  const batches = await mapLimit(ids, concurrency, async id => {
    const keys = await listKeys(store, shardPrefix(id), Infinity);
    return keys.map(key => ({ id, key }));
  });
  const totals = new Map();
  await mapLimit(batches.flat(), concurrency, async ({ id, key }) => {
    const shard = await store.get(key, { type: "json", consistency: "strong" });
    totals.set(id, combineCounts(totals.get(id), shard));
  });
  return totals;
}

export async function getVisitInfo(store, record) {
  const [legacy, shards] = await Promise.all([legacyCounter(store, record.code), loadShardTotals(store, [record])]);
  return combineCounts(legacy, shards.get(visitId(record)));
}

export async function withVisitCounts(store, records) {
  const lane = Math.floor(READ_CONCURRENCY / 2);
  const [shards, bases] = await Promise.all([
    loadShardTotals(store, records, lane),
    mapLimit(records, lane, record => legacyCounter(store, record.code).catch(() => null)),
  ]);
  return records.map((record, index) => {
    const counter = combineCounts(bases[index], shards.get(visitId(record)));
    return { ...record, visits: (Number(record.visits) || 0) + counter.count, lastVisitAt: counter.at };
  });
}

export async function listGroups(store, allowedGroups) {
  if (allowedGroups) {
    const rows = await mapLimit(allowedGroups, READ_CONCURRENCY, name => getRecord(store, name));
    return rows.filter(row => row?.kind === "group").sort((a, b) => a.code.localeCompare(b.code));
  }
  const keys = await listKeys(store, "group-names/", Infinity);
  const roots = await mapLimit(keys, READ_CONCURRENCY, key => getRecord(store, key.slice("group-names/".length, -5)));
  return roots.filter(row => row?.kind === "group").sort((a, b) => a.code.localeCompare(b.code));
}

export async function getApiKey(store, id) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(id))) return null;
  return asObject(await store.get(apiKeyKey(id), { type: "json", consistency: "strong" }));
}

export async function saveNewApiKey(store, record) {
  if (await writeIfNew(store, apiKeyKey(record.id), record)) return true;
  const saved = await getApiKey(store, record.id);
  return saved?.hash === record.hash && saved.owner === record.owner;
}

export async function saveApiKey(store, record) {
  await store.setJSON(apiKeyKey(record.id), record);
}

export async function listApiKeys(store, owner) {
  const keys = await listKeys(store, "api-keys/", Infinity);
  const records = await mapLimit(keys, READ_CONCURRENCY, async (key) => {
    const record = asObject(await store.get(key, { type: "json", consistency: "strong" }));
    if (!record || (owner !== undefined && (record.owner ?? "admin") !== owner)) return null;
    // A broken usage blob must never block authentication.
    const usage = asObject(await store.get(usageKey(record.id), { type: "json", consistency: "strong" }).catch(() => null));
    return { ...record, lastUsedAt: usage?.at || record.lastUsedAt || null };
  });
  return records.filter(Boolean).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}
