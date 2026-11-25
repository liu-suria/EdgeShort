import { hashSecret } from "./_lib.js";
import { rateKey } from "./_storage.js";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

async function load(store, ip) {
  const key = rateKey((await hashSecret(`login:${ip}`)).slice(0, 32));
  const record = await store.get(key, { type: "json", consistency: "strong" });
  return { key, record: record && typeof record === "object" ? record : null };
}

// Fails open: if the limiter's own storage is down, sign-in still works.
export async function loginGate(store, ip) {
  try {
    const { key, record } = await load(store, ip);
    const now = Date.now();
    if (record && now - record.firstAt < WINDOW_MS && record.count >= MAX_FAILURES) {
      return { allowed: false, retryAfter: Math.ceil((record.firstAt + WINDOW_MS - now) / 1000), key, record };
    }
    return { allowed: true, key, record };
  } catch {
    return { allowed: true, key: null, record: null };
  }
}

export async function recordLoginFailure(store, gate) {
  if (!gate.key) return;
  const now = Date.now();
  const fresh = !gate.record || now - gate.record.firstAt >= WINDOW_MS;
  try {
    await store.setJSON(gate.key, { count: fresh ? 1 : gate.record.count + 1, firstAt: fresh ? now : gate.record.firstAt });
  } catch { /* best effort */ }
}

export async function clearLoginFailures(store, gate) {
  if (!gate.key || !gate.record) return;
  try { await store.delete(gate.key); } catch { /* best effort */ }
}
