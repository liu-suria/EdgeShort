import {
  json, normaliseCode, normaliseExpiry, normaliseTitle, normaliseUrl, publicRecord, readJson, requireAuth,
} from "../../_lib.js";
import { getLinkStore, getRecord, recordKey, saveNewRecord, saveRecord } from "../../_storage.js";

function codeFrom(context) {
  return context.params?.code;
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const link = await getRecord(getLinkStore(), codeFrom(context));
    return link ? json({ link: publicRecord(link) }) : json({ error: "Link not found" }, 404);
  } catch (error) {
    return json({ error: error.message || "Unable to load link" }, 500);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const store = getLinkStore();
    const code = codeFrom(context);
    const existing = await getRecord(store, code);
    if (!existing) return json({ error: "Link not found" }, 404);
    const body = await readJson(context.request);
    const url = normaliseUrl(body.url);
    if (!url) return json({ error: "Enter a valid http:// or https:// destination URL" }, 422);
    const nextCode = body.code === undefined ? existing.code : normaliseCode(body.code);
    if (!nextCode) return json({ error: "Short code must be 1–16 letters, numbers, hyphens, or underscores, and cannot be reserved" }, 422);
    const expiresAt = body.expiresAt === undefined ? (existing.expiresAt || null) : normaliseExpiry(body.expiresAt);
    if (expiresAt === undefined) return json({ error: "Expiration must be a future date/time or a whole number of days from 1 to 36500" }, 422);
    const link = { ...existing, code: nextCode, url, title: normaliseTitle(body.title), expiresAt, updatedAt: new Date().toISOString() };
    if (nextCode === existing.code) {
      await saveRecord(store, link);
    } else {
      // Blob keys are based on the short code. Create the new key first so a
      // failed rename never removes the existing short link.
      if (!(await saveNewRecord(store, link))) return json({ error: "That short code is already in use" }, 409);
      await store.delete(recordKey(existing.code));
    }
    return json({ link: publicRecord(link) });
  } catch (error) {
    return json({ error: error.message || "Unable to update link" }, 500);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const store = getLinkStore();
    const code = codeFrom(context);
    if (!(await getRecord(store, code))) return json({ error: "Link not found" }, 404);
    await store.delete(recordKey(code));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return json({ error: error.message || "Unable to delete link" }, 500);
  }
}
