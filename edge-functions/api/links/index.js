import {
  getLinkStore, json, listRecords, makeCode, makeRecordId, normaliseCode,
  normaliseTitle, normaliseUrl, publicRecord, readJson, requireAuth, saveNewRecord,
} from "../../../_lib.js";

export async function onRequestGet(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const links = await listRecords(getLinkStore());
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
    const store = getLinkStore();
    let code = body.code ? normaliseCode(body.code) : null;
    if (body.code && !code) return json({ error: "Short code must be 3–64 letters, numbers, hyphens, or underscores, and cannot be reserved" }, 422);
    const now = new Date().toISOString();
    const createLink = (shortCode) => ({
      id: makeRecordId(), code: shortCode, url, title: normaliseTitle(body.title),
      visits: 0, createdAt: now, updatedAt: now,
    });
    if (code) {
      const link = createLink(code);
      if (!(await saveNewRecord(store, link))) return json({ error: "That short code is already in use" }, 409);
      return json({ link: publicRecord(link) }, 201);
    }
    let link;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = createLink(makeCode());
      if (await saveNewRecord(store, candidate)) {
        link = candidate;
        break;
      }
    }
    if (!link) return json({ error: "Could not allocate a short code. Please try again." }, 503);
    return json({ link: publicRecord(link) }, 201);
  } catch (error) {
    return json({ error: error.message || "Unable to create link" }, 500);
  }
}
