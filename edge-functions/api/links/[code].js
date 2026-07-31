import {
  getKv, getRecord, json, normaliseTitle, normaliseUrl, publicRecord,
  readJson, recordKey, requireAuth,
} from "../../../_lib.js";

function codeFrom(context) {
  return context.params?.code;
}

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const link = await getRecord(getKv(context), codeFrom(context));
    return link ? json({ link: publicRecord(link) }) : json({ error: "Link not found" }, 404);
  } catch (error) {
    return json({ error: error.message || "Unable to load link" }, 500);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const kv = getKv(context);
    const code = codeFrom(context);
    const existing = await getRecord(kv, code);
    if (!existing) return json({ error: "Link not found" }, 404);
    const body = await readJson(context.request);
    const url = normaliseUrl(body.url);
    if (!url) return json({ error: "Enter a valid http:// or https:// destination URL" }, 422);
    const link = { ...existing, url, title: normaliseTitle(body.title), updatedAt: new Date().toISOString() };
    await kv.put(recordKey(code), JSON.stringify(link));
    return json({ link: publicRecord(link) });
  } catch (error) {
    return json({ error: error.message || "Unable to update link" }, 500);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const kv = getKv(context);
    const code = codeFrom(context);
    if (!(await getRecord(kv, code))) return json({ error: "Link not found" }, 404);
    await kv.delete(recordKey(code));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return json({ error: error.message || "Unable to delete link" }, 500);
  }
}
