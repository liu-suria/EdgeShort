import assert from "node:assert/strict";
import test from "node:test";
import { listLinks } from "../edge-functions/_link-page.js";
import { MemoryStore } from "./memory-store.js";

test("1,000 links: page reads are bounded, cursors cover every row once and respect grants", async () => {
  const store = new MemoryStore();
  for (let i = 0; i < 1000; i++) {
    const code = String(i).padStart(4, "0");
    const record = { id: code, code: "gome/" + code, url: "https://example.org/" + i, title: i === 998 ? "needle" : "" };
    await store.setJSON("links/gome~" + code + ".json", record);
    await store.setJSON("visits/gome~" + code + ".json", { count: 3 });
  }
  const page = (query, groups = ["gome"]) => listLinks(store, new URLSearchParams(query), "https://vyu.cc", 100, false, groups);
  const first = await page({limit: "20"});
  assert.equal(first.links.length, 20);
  assert.ok(first.links.every(record => record.visits === 3));
  assert.equal(store.reads, 41);
  const seen = first.links.map(record => record.path);
  let cursor = first.nextCursor;
  await assert.rejects(page({cursor, group:"other"}, []), {status:403});
  await assert.rejects(page({cursor}, []), {status:422});
  while (cursor) {
    const result = await page({limit:"20", cursor});
    seen.push(...result.links.map(record => record.path)); cursor = result.nextCursor;
  }
  assert.equal(seen.length,1000);
  assert.equal(new Set(seen).size,1000);
  let search = await page({q:"needle",limit:"20"});
  assert.equal(search.links.length,0);
  while (search.nextCursor) search = await page({q:"needle",limit:"20",cursor:search.nextCursor});
  assert.deepEqual(search.links.map(row=>row.code),["0998"]);
});
