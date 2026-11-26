import { isGroupName } from "./_lib.js";
import { getRecord } from "./_storage.js";

// Hot-path state lives in module scope, so it is shared by every request that
// lands on the same warm edge instance.
const ROOT_KIND_TTL_MS = 60_000;
const rootKinds = new Map();
const CACHE_TTL_MS = 30_000;
const CACHE_MAX = 500;
const EDGE_CACHE_NAME = "edgeshort-permanent-v2";
const ROUTE_CACHE_NAME = "edgeshort-root-routing-v2";
const EDGE_TTL_SECONDS = 24 * 60 * 60;

// Use the same GET key for every query string and every caller on this origin.
const edgeKey = (origin, code) => new Request(new URL("/" + code, origin).href);

async function openEdgeCache(name = EDGE_CACHE_NAME) {
  try {
    return await globalThis.caches?.open(name);
  } catch {
    return null;
  }
}


const cache = new Map();
let epoch = 0;

// Also bumps `epoch`, so a read that started before the edit cannot re-cache
// the stale record when it returns afterwards.
export async function invalidate(code, origin) {
  epoch += 1;
  cache.delete(code);
  rootKinds.delete(code);
  if (origin) {
    const edge = await openEdgeCache();
    try {
      const key = edgeKey(origin, code);
      const routing = isGroupName(code) && await openEdgeCache(ROUTE_CACHE_NAME);
      await Promise.all([edge?.delete(key), routing && routing.delete(key)]);
    } catch {
      // Node-local eviction is best effort. Other nodes age out independently.
    }
  }
}

export function resetRedirectState() {
  cache.clear();
  rootKinds.clear();
  epoch++;
}

// Recheck ownership within a minute even when an old root redirect has a 24h cache.
export async function lookupRoot(store, code, origin, waitUntil) {
  const hit = rootKinds.get(code);
  if (hit && Date.now() < hit.until) return hit;
  const generation = epoch;
  const edge = await openEdgeCache(ROUTE_CACHE_NAME);
  const key = edge && edgeKey(origin, code);
  let entry;
  if (edge) {
    try {
      const cached = await edge.match(key);
      const value = cached && await cached.json();
      if (value?.until > Date.now() && generation === epoch) entry = value;
    } catch {
      // An expired EO entry can throw instead of returning a miss.
    }
  }
  let record;
  if (!entry) {
    const until = Date.now() + ROOT_KIND_TTL_MS;
    record = await getRecord(store, code);
    const group = record?.kind === "group";
    const member = group && record.defaultCode ? await getRecord(store, code + "/" + record.defaultCode) : null;
    const link = member && member.id === record.defaultId
      ? { id: member.id, code: member.code, url: member.url, expiresAt: member.expiresAt } : null;
    entry = { until, group, link, expiresAt: group ? record.expiresAt : null };
    if (record && edge && generation === epoch) {
      const write = async () => {
        try {
          await edge.put(key, new Response(JSON.stringify(entry), { headers: { "Cache-Control": "public, max-age=60" } }));
          if (generation !== epoch) await edge.delete(key);
        } catch { /* Serve the strongly read mapping. */ }
      };
      if (waitUntil) waitUntil(write());
      else await write();
    }
  }
  if (generation === epoch && record !== null) {
    if (rootKinds.size >= CACHE_MAX) rootKinds.clear();
    rootKinds.set(code, entry);
  }
  return { ...entry, record };
}

export async function lookupLink(store, code, origin, waitUntil, initialRecord) {
  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { link: hit.link, source: "instance" };

  const startedAt = epoch;
  const edge = await openEdgeCache();
  const key = edge && edgeKey(origin, code);
  if (edge) {
    try {
      const cached = await edge.match(key);
      if (cached?.status === 200 && startedAt === epoch) {
        const link = await cached.json();
        if (link?.url && link.code === code && startedAt === epoch) return { link, source: "edge" };
      }
    } catch {
      // EO may throw 504 for an expired entry. Read the current Blob below.
    }
  }

  // Use a fresh mapping when populating a day-long cache.
  const link = initialRecord !== undefined ? initialRecord : await getRecord(store, code, edge ? "strong" : "eventual");
  if (link?.url && startedAt === epoch) {
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(code, { link, at: Date.now() });
    if (edge && !link.expiresAt) {
      const write = async () => {
        try {
          await edge.put(key, new Response(JSON.stringify({ id: link.id, code, url: link.url }), {
            headers: { "Cache-Control": `public, max-age=${EDGE_TTL_SECONDS}` },
          }));
          if (startedAt !== epoch) await edge.delete(key);
        } catch {
          // The Blob lookup already succeeded. A cache failure must not break the redirect.
        }
      };
      if (waitUntil) waitUntil(write());
      else await write();
    }
  }
  return { link, source: "miss" };
}
