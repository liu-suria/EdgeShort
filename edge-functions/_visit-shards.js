// Each warm writer owns one durable shard per link. Writers never overwrite each
// other's totals. A new isolate or an evicted entry always allocates a fresh key.
const writers = new WeakMap();
const MAX_LOCAL_LINKS = 500;

export const visitId = link => link.id || "legacy-root:" + link.code;
export const shardPrefix = id => "visit-shards/" + encodeURIComponent(id) + "/";

export function recordVisit(store, link) {
  const id = visitId(link);
  let links = writers.get(store);
  if (!links) {
    links = new Map();
    writers.set(store, links);
  }
  let writer = links.get(id);
  if (!writer) {
    if (links.size >= MAX_LOCAL_LINKS) links.delete(links.keys().next().value);
    writer = { key: shardPrefix(id) + crypto.randomUUID() + ".json", count: 0, tail: Promise.resolve() };
    links.set(id, writer);
  }

  if (!writer.batch) {
    const batch = { delta: 0, at: null };
    writer.batch = batch;
    batch.commit = writer.tail.then(async () => {
      writer.batch = null;
      const count = writer.count + batch.delta;
      const snapshot = { count, at: batch.at };
      try {
        await store.setJSON(writer.key, snapshot);
      } catch {
        // A lost acknowledgement can mean the original write committed. Retrying
        // exactly the same key and cumulative value cannot add another visit.
        await store.setJSON(writer.key, snapshot);
      }
      writer.count = count;
    });
    writer.tail = batch.commit.catch(() => {});
  }
  writer.batch.delta++;
  writer.batch.at = new Date().toISOString();
  return writer.batch.commit;
}
