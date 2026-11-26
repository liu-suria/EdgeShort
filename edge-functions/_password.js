import { toBase64Url } from "./_lib.js";
const iterations = 600000;

export async function derive(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations,
  }, material, 256);
  return toBase64Url(bits);
}
