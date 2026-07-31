import { getStore } from "@edgeone/pages-blob";

const STORE_NAME = "edgeshort-links";

export function getLinkStore() {
  // Makers creates this Blob namespace automatically on its first use. No
  // dashboard binding or storage credential is needed inside an Edge Function.
  return getStore(STORE_NAME);
}

export function recordKey(code) {
  return `links/${code}.json`;
}

export function apiKeyKey(id) {
  return `api-keys/${id}.json`;
}

export async function getRecord(store, code, consistency = "strong") {
  const record = await store.get(recordKey(code), { type: "json", consistency });
  return record && typeof record === "object" ? record : null;
}

export async function saveNewRecord(store, record) {
  await store.setJSON(recordKey(record.code), record, { onlyIfNew: true });
  const saved = await getRecord(store, record.code);
  return saved?.id === record.id;
}

export async function saveRecord(store, record) {
  await store.setJSON(recordKey(record.code), record);
}

export async function getApiKey(store, id) {
  const record = await store.get(apiKeyKey(id), { type: "json", consistency: "strong" });
  return record && typeof record === "object" ? record : null;
}

export async function saveNewApiKey(store, record) {
  await store.setJSON(apiKeyKey(record.id), record, { onlyIfNew: true });
  const saved = await getApiKey(store, record.id);
  return saved?.id === record.id;
}

export async function saveApiKey(store, record) {
  await store.setJSON(apiKeyKey(record.id), record);
}

export async function listApiKeys(store) {
  const { blobs = [] } = await store.list({ prefix: "api-keys/", consistency: "strong" });
  if (blobs.length > 100) throw new Error("Too many API keys");
  const records = await Promise.all(blobs.map(async ({ key }) => {
    const value = await store.get(key, { type: "json", consistency: "strong" });
    return value && typeof value === "object" ? value : null;
  }));
  return records.filter(Boolean).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export async function listRecords(store, toPublicRecord) {
  const { blobs = [] } = await store.list({ prefix: "links/", consistency: "strong" });
  if (blobs.length > 5_000) throw new Error("Too many links to list in one request");
  const records = await Promise.all(blobs.map(async ({ key }) => {
    const value = await store.get(key, { type: "json", consistency: "strong" });
    return value && typeof value === "object" ? toPublicRecord(value) : null;
  }));
  return records.filter(Boolean).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}
