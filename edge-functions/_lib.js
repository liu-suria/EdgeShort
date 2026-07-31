const encoder = new TextEncoder();

// The __Host- prefix prevents a subdomain from setting a competing session cookie.
export const COOKIE_NAME = "__Host-edgeshort_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,16}$/;
const RESERVED_CODES = new Set([
  "admin", "api", "favicon", "faviconico", "robots", "sitemap", "assets",
  "edge-functions", "cloud-functions", "index", "login", "logout",
]);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
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

export function getSecrets(context) {
  const env = context?.env || {};
  const adminPassword = env.ADMIN_PASSWORD || globalThis.ADMIN_PASSWORD;
  const sessionSecret = env.SESSION_SECRET || globalThis.SESSION_SECRET;
  if (!adminPassword || !sessionSecret) {
    throw new Error("ADMIN_PASSWORD and SESSION_SECRET must be configured");
  }
  return { adminPassword: String(adminPassword), sessionSecret: String(sessionSecret) };
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

export async function createSession(sessionSecret) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  const unsigned = `${issuedAt}.${nonce}`;
  return `${unsigned}.${await hmac(unsigned, sessionSecret)}`;
}

export async function isAuthenticated(request, sessionSecret) {
  const token = parseCookies(request)[COOKIE_NAME];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d{10}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{16,}$/.test(parts[1])) return false;
  const issuedAt = Number(parts[0]);
  const now = Math.floor(Date.now() / 1000);
  if (issuedAt > now + 60 || now - issuedAt > SESSION_MAX_AGE) return false;
  return timingSafeEqual(parts[2], await hmac(`${parts[0]}.${parts[1]}`, sessionSecret));
}

export function sessionCookie(value) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export function requireAuth(context) {
  let secrets;
  try {
    secrets = getSecrets(context);
  } catch (error) {
    return { response: json({ error: "Server authentication is not configured" }, 503) };
  }
  return isAuthenticated(context.request, secrets.sessionSecret).then((authenticated) => (
    authenticated ? { secrets } : { response: json({ error: "Unauthorized" }, 401) }
  ));
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

export function publicRecord(record) {
  return {
    code: record.code,
    url: record.url,
    title: record.title || "",
    expiresAt: record.expiresAt || null,
    visits: Number(record.visits) || 0,
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

export function makeApiKey() {
  return `esk_${toBase64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
}

export function normaliseApiKeyName(input) {
  const name = String(input || "").trim().slice(0, 48);
  return name || "Default API key";
}

export async function readJson(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 10_240) throw new Error("Request body is too large");
  const body = await request.text();
  if (body.length > 10_240) throw new Error("Request body is too large");
  try {
    const data = JSON.parse(body || "{}");
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error();
    return data;
  } catch {
    throw new Error("Invalid JSON request body");
  }
}
