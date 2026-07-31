import { hashSecret, json, timingSafeEqual } from "./_lib.js";
import { getLinkStore, listApiKeys, saveApiKey } from "./_storage.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function apiJson(data, status = 200, headers = {}) {
  return json(data, status, { ...CORS_HEADERS, ...headers });
}

export function apiOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function apiToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  return bearer || request.headers.get("X-API-Key") || "";
}

export async function requireApiKey(context) {
  const token = apiToken(context.request);
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    return { response: apiJson({ error: "A valid API key is required" }, 401, { "WWW-Authenticate": "Bearer" }) };
  }
  try {
    const store = getLinkStore();
    const tokenHash = await hashSecret(token);
    const key = (await listApiKeys(store)).find((candidate) => !candidate.revokedAt && typeof candidate.hash === "string" && timingSafeEqual(candidate.hash, tokenHash));
    if (!key) return { response: apiJson({ error: "A valid API key is required" }, 401, { "WWW-Authenticate": "Bearer" }) };
    key.lastUsedAt = new Date().toISOString();
    await saveApiKey(store, key);
    return { store, key };
  } catch {
    return { response: apiJson({ error: "API authentication is temporarily unavailable" }, 503) };
  }
}
