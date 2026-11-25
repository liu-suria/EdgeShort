import { getStore } from "@edgeone/pages-blob";
import { isCodeShape } from "./_lib.js";

const STORE_NAME = "edgeshort-links";
const MAX_LINKS = 5_000;
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
export const recordKey = (code) => `links/${code}.json`;
export const visitsKey = (code) => `visits/${code}.json`;
export const apiKeyKey = (id) => `api-keys/${id}.json`;
export const usageKey = (id) => `api-key-usage/${id}.json`;
export const rateKey = (id) => `ratelimit/${id}.json`;

const asObject = (value) => (value && typeof value === "object" ? value : null);

async function mapLimit(items, limit, fn) {
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

export async function getRecord(store, code, consistency = "strong") {
  // Reject junk paths (scanners, favicon.ico, ...) without touching storage.
  if (!isCodeShape(code)) return null;
  return asObject(await store.get(recordKey(code), { type: "json", consistency }));
}

// The SDK throws PRECONDITION_FAILED when an onlyIfNew write finds the key taken.
// Treat that as "not created", and as success if the existing record is ours
// (which makes a retried rename idempotent).
async function writeIfNew(store, key, record) {
  try {
    await store.setJSON(key, record, { onlyIfNew: true });
  } catch (error) {
    if (error?.code !== "PRECONDITION_FAILED") throw error;
  }
}

export async function saveNewRecord(store, record) {
  await writeIfNew(store, recordKey(record.code), record);
  const saved = await getRecord(store, record.code);
  return saved?.id === record.id;
}

export async function saveRecord(store, record) {
  await store.setJSON(recordKey(record.code), record);
}

export async function getVisitInfo(store, code) {
  const value = asObject(await store.get(visitsKey(code), { type: "json", consistency: "strong" }));
  return { count: Number(value?.count) || 0, at: value?.at || null };
}

export async function getVisits(store, code) {
  return (await getVisitInfo(store, code)).count;
}

export async function setVisits(store, code, count) {
  await store.setJSON(visitsKey(code), { count, at: new Date().toISOString() });
}

export async function addVisits(store, code, delta) {
  await setVisits(store, code, (await getVisits(store, code)) + delta);
}

// Records returned here carry `visits` (legacy in-record count + counter blob) and `lastVisitAt`.
export async function listRecords(store) {
  const [linkKeys, visitKeys] = await Promise.all([
    listKeys(store, "links/", MAX_LINKS),
    listKeys(store, "visits/", MAX_LINKS),
  ]);
  const [records, counters] = await Promise.all([
    mapLimit(linkKeys, READ_CONCURRENCY, async (key) => asObject(await store.get(key, { type: "json", consistency: "strong" }))),
    // One unreadable counter must not break the whole list; it counts as 0.
    mapLimit(visitKeys, READ_CONCURRENCY, async (key) => [key, asObject(await store.get(key, { type: "json", consistency: "strong" }).catch(() => null))]),
  ]);
  const visits = new Map(counters.map(([key, value]) => [key.slice("visits/".length, -".json".length), value]));
  return records
    .filter(Boolean)
    .map((record) => {
      const counter = visits.get(record.code);
      return { ...record, visits: (Number(record.visits) || 0) + (Number(counter?.count) || 0), lastVisitAt: counter?.at || null };
    })
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export async function getApiKey(store, id) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(String(id))) return null;
  return asObject(await store.get(apiKeyKey(id), { type: "json", consistency: "strong" }));
}

export async function saveNewApiKey(store, record) {
  await writeIfNew(store, apiKeyKey(record.id), record);
  return (await getApiKey(store, record.id))?.id === record.id;
}

export async function saveApiKey(store, record) {
  await store.setJSON(apiKeyKey(record.id), record);
}

export async function listApiKeys(store) {
  const keys = await listKeys(store, "api-keys/", 100);
  const records = await mapLimit(keys, READ_CONCURRENCY, async (key) => {
    const record = asObject(await store.get(key, { type: "json", consistency: "strong" }));
    if (!record) return null;
    // A broken usage blob must never block authentication.
    const usage = asObject(await store.get(usageKey(record.id), { type: "json", consistency: "strong" }).catch(() => null));
    return { ...record, lastUsedAt: usage?.at || record.lastUsedAt || null };
  });
  return records.filter(Boolean).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}
