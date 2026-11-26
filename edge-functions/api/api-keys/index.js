import { requireAuth } from "../../_accounts.js";
import {
  errorResponse, hashSecret, json, makeApiKey, normaliseApiKeyName, readJson,
} from "../../_lib.js";
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
    return json({ keys: (await listApiKeys(getLinkStore(), (auth.user.owner ?? auth.user.username))).map(publicApiKey) });
  } catch (error) {
    return errorResponse(error, json, "Unable to load API keys");
  }
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const body = await readJson(context.request);
    const { id, value } = makeApiKey();
    const record = {
      owner: (auth.user.owner ?? auth.user.username), id, name: normaliseApiKeyName(body.name), prefix: value.slice(0, 12),
      hash: await hashSecret(value), createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null,
    };
    if (!(await saveNewApiKey(getLinkStore(), record))) throw new Error("API key id collision");
    return json({ key: { ...publicApiKey(record), value } }, 201);
  } catch (error) {
    return errorResponse(error, json, "Unable to create API key");
  }
}
