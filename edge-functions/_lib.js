const encoder = new TextEncoder();

// The __Host- prefix prevents a subdomain from setting a competing session cookie.
export const COOKIE_NAME = "__Host-edgeshort_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;
const RESERVED_CODES = new Set([
  "admin", "api", "favicon", "faviconico", "robots", "sitemap", "assets",
  "edge-functions", "cloud-functions", "index", "login", "logout",
]);

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Expected failures (HttpError) keep their own status and message. Anything else
// is logged and answered with a generic message so internals are never leaked.
export function errorResponse(error, respond, fallback) {
  if (error instanceof HttpError) return respond({ error: error.message, details: error.details }, error.status);
  console.error(fallback, error);
  return respond({ error: fallback }, 500);
}

export function json(data, status = 200, headers = {}) {
  return new Response(status === 204 || status === 304 ? null : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export function methodNotAllowed() {
  return json({ error: "Method not allowed" }, 405, { Allow: "GET, POST, PATCH, DELETE" });
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  return header.split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index > 0) cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim();
    return cookies;
  }, {});
}

export function toBase64Url(bytes) {
  let binary = "";
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let index = 0; index < array.length; index += 1) binary += String.fromCharCode(array[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function timingSafeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

export async function hashSecret(value) {
  return toBase64Url(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function passwordMatches(supplied, expected) {
  return timingSafeEqual(await hashSecret(supplied), await hashSecret(expected));
}

export async function createSession(sessionSecret, username = "admin", version = 1) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const unsigned = [issuedAt, nonce, username, version].join(".");
  return unsigned + "." + await hmac(unsigned, sessionSecret);
}

export async function sessionIdentity(request, sessionSecret) {
  const token = parseCookies(request)[COOKIE_NAME] || "";
  const parts = token.split(".");
  // Existing signed three-part sessions were exclusively issued to the site admin.
  if (![3, 5].includes(parts.length) || !/^\d{10}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{16,}$/.test(parts[1])) return null;
  const signature = parts.pop();
  if (!timingSafeEqual(signature, await hmac(parts.join("."), sessionSecret))) return null;
  const now = Math.floor(Date.now() / 1000);
  if (+parts[0] > now + 60 || now - Number(parts[0]) > SESSION_MAX_AGE) return null;
  return { username: parts[2] ?? "admin", version: Number(parts[3] ?? 1) };
}

export function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function isCodeShape(input) {
  return typeof input === "string" && CODE_PATTERN.test(input) && !RESERVED_CODES.has(input.toLowerCase());
}

export function isAccountName(value) {
  return typeof value === "string" && /^[a-z][a-z0-9_-]*$/.test(value);
}

export function isGroupName(value) {
  return isCodeShape(value) && /^[a-z][a-z0-9-]*$/.test(value);
}

export function linkPath(group, code) {
  return group ? group + "/" + code : code;
}

export function splitLinkPath(path) {
  const parts = path.split("/");
  return parts.length === 1 ? { group: "", code: parts[0] } : { group: parts[0], code: parts[1] };
}

export function isLinkPath(path) {
  if (typeof path !== "string") return false;
  const parts = path.split("/");
  return parts.length === 1 ? isCodeShape(parts[0])
    : parts.length === 2 && isGroupName(parts[0]) && isCodeShape(parts[1]);
}

// Validate each router parameter separately, including percent-decoded slashes.
export function routeLinkPath({ group, code } = {}) {
  if (!isCodeShape(code) || (group !== undefined && !isGroupName(group))) return null;
  return linkPath(group, code);
}

export function clientIp(request) {
  const headers = request.headers;
  return (headers.get("EO-Connecting-IP") || headers.get("X-Real-IP") || headers.get("X-Forwarded-For") || "unknown")
    .split(",")[0].trim().slice(0, 64) || "unknown";
}

export function normaliseCode(input) {
  const code = String(input || "").trim();
  if (!CODE_PATTERN.test(code) || RESERVED_CODES.has(code.toLowerCase())) return null;
  return code;
}

export function normaliseUrl(input) {
  if (typeof input !== "string" || input.length > 2048) return null;
  try {
    const url = new URL(input.trim());
    if (!/^https?:$/.test(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function normaliseTitle(input) {
  if (input === undefined || input === null) return "";
  return String(input).trim().slice(0, 120);
}

// An empty value deliberately means "never expires". The admin and API can
// supply a whole number of days (for example, `3` means the link expires three
// days after this request); ISO date strings remain supported by the API.
// Invalid or past values are kept distinct so API handlers can return a useful
// validation error.
export function normaliseExpiry(input) {
  if (input === undefined || input === null || String(input).trim() === "") return null;
  if (typeof input === "number") {
    if (!Number.isSafeInteger(input) || input < 1 || input > 36_500) return undefined;
    return new Date(Date.now() + input * 86_400_000).toISOString();
  }
  if (typeof input !== "string" || input.length > 80) return undefined;
  const time = Date.parse(input);
  if (!Number.isFinite(time) || time <= Date.now()) return undefined;
  return new Date(time).toISOString();
}

function platformAddress(origin, path) {
  const platform = origin === "https://667989.xyz" ? "https://vyu.cc" : origin;
  const platformUrl = platform + "/" + path;
  return { platformUrl, brandUrl: null, shortUrl: platformUrl };
}

export function publicGroup(record, origin) {
  return { name: record.code, ...platformAddress(origin, record.code), expiresAt: record.expiresAt ?? null, defaultCode: record.defaultCode ?? null };
}

export function publicRecord(record, origin = "") {
  const expired = Boolean(record.expiresAt) && Date.parse(record.expiresAt) <= Date.now();
  return {
    ...splitLinkPath(record.code),
    path: record.code,
    ...platformAddress(origin, record.code),
    url: record.url,
    title: record.title || "",
    status: expired ? "expired" : "active",
    expiresAt: record.expiresAt || null,
    visits: Number(record.visits) || 0,
    lastVisitAt: record.lastVisitAt || null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function makeCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  let code = "";
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return code;
}

export function makeRecordId() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
}

// New keys look like `esk_<16 hex id>.<secret>`; the id lets authentication
// load exactly one record instead of scanning every key.
export const API_KEY_FORMAT = /^esk_([0-9a-f]{16})\.[A-Za-z0-9_-]{43}$/;

export function makeApiKeyId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function makeApiKey(id = makeApiKeyId()) {
  return { id, value: `esk_${id}.${toBase64Url(crypto.getRandomValues(new Uint8Array(32)))}` };
}

export function normaliseApiKeyName(input) {
  const name = String(input || "").trim().slice(0, 48);
  return name || "Default API key";
}

export async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 10_240) throw new HttpError(413, "Request body is too large");
  const body = await request.text();
  if (body.length > 10_240) throw new HttpError(413, "Request body is too large");
  try {
    const data = JSON.parse(body || "{}");
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error();
    return data;
  } catch {
    throw new HttpError(400, "Invalid JSON request body");
  }
}
