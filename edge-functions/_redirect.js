import { addVisits, getRecord } from "./_storage.js";

// Hot-path state lives in module scope, so it is shared by every request that
// lands on the same warm edge instance.
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 500;
const FLUSH_GAP_MS = 10_000;
const TRACK_MAX = 1_000;

const cache = new Map();
const pending = new Map();
const flushing = new Set();
const lastFlush = new Map();
let epoch = 0;

// Also bumps `epoch`, so a read that started before the edit cannot re-cache
// the stale record when it returns afterwards.
export function invalidate(code) {
  epoch += 1;
  cache.delete(code);
}

// For deletes and renames: unflushed counts belong to a link that is gone.
export function dropPendingVisits(code) {
  pending.delete(code);
}

export function resetRedirectState() {
  cache.clear();
  pending.clear();
  flushing.clear();
  lastFlush.clear();
}

// Eventually consistent read, memoised briefly. Edits made on another instance
// can therefore take up to CACHE_TTL_MS (plus Blob propagation) to show up.
export async function lookupLink(store, code) {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.link;
  const startedAt = epoch;
  const link = await getRecord(store, code, "eventual");
  if (link?.url && startedAt === epoch) {
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(code, { link, at: Date.now() });
  } else if (!link?.url) {
    cache.delete(code);
  }
  return link;
}

async function flush(store, code) {
  const count = pending.get(code) || 0;
  pending.delete(code);
  try {
    // A link deleted after the visit must not get its counter recreated.
    if (count && (await getRecord(store, code))) await addVisits(store, code, count);
  } catch {
    pending.set(code, (pending.get(code) || 0) + count);
  } finally {
    flushing.delete(code);
  }
}

// Counts are coalesced per code: at most one counter write every FLUSH_GAP_MS
// per instance, however many visits arrive. Best effort by design.
export function recordVisit(store, code, waitUntil) {
  pending.set(code, (pending.get(code) || 0) + 1);
  if (flushing.has(code) || Date.now() - (lastFlush.get(code) || 0) < FLUSH_GAP_MS) return;
  if (lastFlush.size >= TRACK_MAX) lastFlush.clear();
  flushing.add(code);
  lastFlush.set(code, Date.now());
  const task = flush(store, code);
  if (typeof waitUntil === "function") waitUntil(task);
}
