import { makeCode, makeRecordId, normaliseCode, normaliseExpiry, normaliseTitle, normaliseUrl, publicRecord, readJson } from "../../../_lib.js";
import { apiJson, apiOptions, requireApiKey } from "../../../_api.js";
import { getLinkStore, listRecords, saveNewRecord } from "../../../_storage.js";

export function onRequestOptions() { return apiOptions(); }

export async function onRequestGet(context) {
  const auth = await requireApiKey(context);
  if (auth.response) return auth.response;
  try {
    const links = await listRecords(auth.store, publicRecord);
    const query = new URL(context.request.url).searchParams.get("q")?.trim().toLowerCase();
    const filtered = query ? links.filter((link) => [link.code, link.url, link.title].join(" ").toLowerCase().includes(query)) : links;
    return apiJson({ links: filtered, total: filtered.length });
  } catch (error) {
    return apiJson({ error: error.message || "Unable to load links" }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = await requireApiKey(context);
  if (auth.response) return auth.response;
  try {
    const body = await readJson(context.request);
    const url = normaliseUrl(body.url);
    if (!url) return apiJson({ error: "Enter a valid http:// or https:// destination URL" }, 422);
    const expiresAt = normaliseExpiry(body.expiresAt);
    if (expiresAt === undefined) return apiJson({ error: "Expiration must be a future date/time or a whole number of days from 1 to 36500" }, 422);
    const requestedCode = body.code ? normaliseCode(body.code) : null;
    if (body.code && !requestedCode) return apiJson({ error: "Short code must be 1–16 letters, numbers, hyphens, or underscores, and cannot be reserved" }, 422);
    const now = new Date().toISOString();
    const createLink = (code) => ({ id: makeRecordId(), code, url, title: normaliseTitle(body.title), visits: 0, expiresAt, createdAt: now, updatedAt: now });
    if (requestedCode) {
      const link = createLink(requestedCode);
      if (!(await saveNewRecord(auth.store, link))) return apiJson({ error: "That short code is already in use" }, 409);
      return apiJson({ link: publicRecord(link) }, 201);
    }
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const link = createLink(makeCode());
      if (await saveNewRecord(auth.store, link)) return apiJson({ link: publicRecord(link) }, 201);
    }
    return apiJson({ error: "Could not allocate a short code. Please try again." }, 503);
  } catch (error) {
    return apiJson({ error: error.message || "Unable to create link" }, 500);
  }
}
