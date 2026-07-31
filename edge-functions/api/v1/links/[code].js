import { normaliseCode, normaliseExpiry, normaliseTitle, normaliseUrl, publicRecord, readJson } from "../../../_lib.js";
import { apiJson, apiOptions, requireApiKey } from "../../../_api.js";
import { getRecord, recordKey, saveNewRecord, saveRecord } from "../../../_storage.js";

export function onRequestOptions() { return apiOptions(); }

export async function onRequestGet(context) {
  const auth = await requireApiKey(context);
  if (auth.response) return auth.response;
  try {
    const link = await getRecord(auth.store, context.params?.code);
    return link ? apiJson({ link: publicRecord(link) }) : apiJson({ error: "Link not found" }, 404);
  } catch (error) {
    return apiJson({ error: error.message || "Unable to load link" }, 500);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireApiKey(context);
  if (auth.response) return auth.response;
  try {
    const currentCode = context.params?.code;
    const existing = await getRecord(auth.store, currentCode);
    if (!existing) return apiJson({ error: "Link not found" }, 404);
    const body = await readJson(context.request);
    const url = normaliseUrl(body.url);
    if (!url) return apiJson({ error: "Enter a valid http:// or https:// destination URL" }, 422);
    const nextCode = body.code === undefined ? existing.code : normaliseCode(body.code);
    if (!nextCode) return apiJson({ error: "Short code must be 1–16 letters, numbers, hyphens, or underscores, and cannot be reserved" }, 422);
    const expiresAt = body.expiresAt === undefined ? (existing.expiresAt || null) : normaliseExpiry(body.expiresAt);
    if (expiresAt === undefined) return apiJson({ error: "Expiration time must be a valid future date and time" }, 422);
    const link = { ...existing, code: nextCode, url, title: normaliseTitle(body.title), expiresAt, updatedAt: new Date().toISOString() };
    if (nextCode === existing.code) await saveRecord(auth.store, link);
    else {
      if (!(await saveNewRecord(auth.store, link))) return apiJson({ error: "That short code is already in use" }, 409);
      await auth.store.delete(recordKey(existing.code));
    }
    return apiJson({ link: publicRecord(link) });
  } catch (error) {
    return apiJson({ error: error.message || "Unable to update link" }, 500);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireApiKey(context);
  if (auth.response) return auth.response;
  try {
    const code = context.params?.code;
    if (!(await getRecord(auth.store, code))) return apiJson({ error: "Link not found" }, 404);
    await auth.store.delete(recordKey(code));
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } });
  } catch (error) {
    return apiJson({ error: error.message || "Unable to delete link" }, 500);
  }
}
