import {
  getKv, getRecord, json, listRecords, makeCode, normaliseCode, normaliseTitle,
  normaliseUrl, publicRecord, readJson, recordKey, requireAuth,
} from "../../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const links = await listRecords(getKv(context));
    const query = new URL(context.request.url).searchParams.get("q")?.trim().toLowerCase();
    const filtered = query ? links.filter((link) => [link.code, link.url, link.title].join(" ").toLowerCase().includes(query)) : links;
    return json({ links: filtered, total: filtered.length });
  } catch (error) {
    return json({ error: error.message || "Unable to load links" }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const body = await readJson(context.request);
    const url = normaliseUrl(body.url);
    if (!url) return json({ error: "Enter a valid http:// or https:// destination URL" }, 422);
    const kv = getKv(context);
    let code = body.code ? normaliseCode(body.code) : null;
    if (body.code && !code) return json({ error: "Short code must be 3–64 letters, numbers, hyphens, or underscores, and cannot be reserved" }, 422);
    if (code && await getRecord(kv, code)) return json({ error: "That short code is already in use" }, 409);
    if (!code) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidate = makeCode();
        if (!(await getRecord(kv, candidate))) {
          code = candidate;
          break;
        }
      }
      if (!code) return json({ error: "Could not allocate a short code. Please try again." }, 503);
    }
    const now = new Date().toISOString();
    const link = { code, url, title: normaliseTitle(body.title), visits: 0, createdAt: now, updatedAt: now };
    await kv.put(recordKey(code), JSON.stringify(link));
    return json({ link: publicRecord(link) }, 201);
  } catch (error) {
    return json({ error: error.message || "Unable to create link" }, 500);
  }
}
