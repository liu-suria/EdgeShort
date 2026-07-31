import { hashSecret, json, makeApiKey, makeRecordId, normaliseApiKeyName, readJson, requireAuth } from "../../_lib.js";
import { getLinkStore, listApiKeys, saveNewApiKey } from "../../_storage.js";

function publicApiKey(record) {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt || null,
    revokedAt: record.revokedAt || null,
  };
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const keys = await listApiKeys(getLinkStore());
    return json({ keys: keys.map(publicApiKey) });
  } catch (error) {
    return json({ error: error.message || "Unable to load API keys" }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const body = await readJson(context.request);
    const value = makeApiKey();
    const now = new Date().toISOString();
    const record = {
      id: makeRecordId(), name: normaliseApiKeyName(body.name), prefix: value.slice(0, 12),
      hash: await hashSecret(value), createdAt: now, lastUsedAt: null, revokedAt: null,
    };
    if (!(await saveNewApiKey(getLinkStore(), record))) throw new Error("Could not allocate an API key. Please try again.");
    return json({ key: { ...publicApiKey(record), value } }, 201);
  } catch (error) {
    return json({ error: error.message || "Unable to create API key" }, 500);
  }
}
