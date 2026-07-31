import {
  json, normaliseTitle, normaliseUrl, publicRecord, readJson, requireAuth,
} from "../../_lib.js";
import { getLinkStore, getRecord, recordKey, saveRecord } from "../../_storage.js";

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
    const link = { ...existing, url, title: normaliseTitle(body.title), updatedAt: new Date().toISOString() };
    await saveRecord(store, link);
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
