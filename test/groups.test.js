import test from "node:test";
import assert from "node:assert/strict";
import { startPreview } from "./preview.mjs";

test("legacy URLs, groups, members and automation work through HTTP", async t => {
  const app = await startPreview();
  t.after(app.close);
  const { origin, store } = app;
  const send = (path, method = "GET", data, headers = {}) => fetch(origin + path, {
    method, redirect: "manual", headers: { "Content-Type": "application/json", ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const login = await send("/api/auth/login", "POST", { password: "preview-only" });
  const cookie = { Cookie: login.headers.get("set-cookie").split(";")[0] };
  const key = await (await send("/api/api-keys", "POST", { name: "local QA" }, cookie)).json();
  const auth = { Authorization: "Bearer " + key.key.value };
  const api = (path, method, body) => send("/api/v1/" + path, method, body, auth);
  const expectTarget = async (path, tail) => {
    const response = await send(path);
    assert.equal(response.status, 302, path);
    assert.equal(response.headers.get("location"), origin + "/_preview/targets/" + tail, path);
  };
  const target = code => origin + "/_preview/targets/" + code;

  await t.test("admin loads groups and links together; racing root/group claims have one winner", async () => {
    const listing = await (await send("/api/links", "GET", undefined, cookie)).json();
    assert.equal(listing.groups.find(g => g.name === "gome").defaultCode, "summer");
    assert.ok(listing.links.some(link => link.path === "gome/xxxxx"));
    const responses = await Promise.all([
      api("groups", "POST", { name: "race" }),
      api("links", "POST", { code: "race", url: target("race") }),
    ]);
    assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
  });
  await t.test("old /gpt preserves its target and historical visit count", async () => {
    await expectTarget("/gpt", "legacy-gpt");
    assert.equal((await (await api("links/gpt")).json()).link.visits, 8);
    assert.equal((await send("/api/v1/groups")).status, 401);
  });
  await t.test("/gome switches in one hop, members and the root namespace stay independent", async () => {
    await expectTarget("/gome", "summer");
    const before = (await (await api("links/gome/winter")).json()).link.visits;
    assert.equal((await api("groups/gome", "PATCH", { defaultCode: "winter" })).status, 200);
    await expectTarget("/gome/", "winter");
    assert.equal((await (await api("links/gome/winter")).json()).link.visits, before + 1);
    await expectTarget("/gome", "winter");
    await expectTarget("/gome/xxxxx", "xxxxx");
    await expectTarget("/gome/summer", "summer");
    assert.equal((await send("/gome/typo")).status, 404);
    assert.equal((await api("links", "POST", { code: "xxxxx", url: target("root") })).status, 201);
    await expectTarget("/xxxxx", "root");
    await expectTarget("/gome/xxxxx", "xxxxx");
    assert.equal((await api("links", "POST", { code: "gome", url: target("bad") })).status, 409);
    assert.equal((await api("links/gome/winter", "DELETE")).status, 409);
    assert.equal((await api("links/gome/winter", "PATCH", { group: "" })).status, 409);
  });
  await t.test("groups and expiring links can be configured entirely via bearer API", async () => {
    assert.equal((await api("groups", "POST", { name: "events" })).status, 201);
    assert.equal((await send("/events")).status, 404);
    const expiry = new Date(Date.now() + 86400_000).toISOString();
    const created = await (await api("links", "POST", { group: "events", url: target("event"), expiresAt: expiry })).json();
    assert.equal(created.link.expiresAt, expiry);
    assert.equal(created.link.path, "events/" + created.link.code);
    assert.equal((await api("groups/events", "PATCH", { defaultCode: created.link.code })).status, 200);
    await expectTarget("/events", "event");
    const near = new Date(Date.now() + 200).toISOString();
    assert.equal((await api("links/" + created.link.path, "PATCH", { expiresAt: near })).status, 200);
    await new Promise(done => setTimeout(done, 230));
    assert.equal((await send("/" + created.link.path)).status, 410);
    assert.equal((await send("/events")).status, 410);
    assert.equal((await api("groups/events", "PATCH", { defaultCode: null })).status, 200);
    assert.equal((await send("/events")).status, 404);
    assert.equal((await api("links/" + created.link.path, "DELETE")).status, 204);
    assert.equal((await (await api("links?group=events")).json()).total, 0);
    assert.equal((await api("groups", "POST", { name: "admin" })).status, 422);
  });
  await t.test("entry expiry leaves a permanent member independently accessible", async () => {
    const until = new Date(Date.now() + 200).toISOString();
    const response = await api("groups/gome", "PATCH", { expiresAt: until });
    assert.equal((await response.json()).group.defaultCode, "winter");
    await expectTarget("/gome", "winter");
    await new Promise(done => setTimeout(done, 230));
    assert.equal((await send("/gome")).status, 410);
    await expectTarget("/gome/winter", "winter");
    await api("groups/gome", "PATCH", { expiresAt: null });
    await expectTarget("/gome", "winter");
  });
  await t.test("explicit upgrade preserves destination and counts; group marker is protected", async () => {
    const current = (await (await api("links/gpt")).json()).link;
    assert.equal((await api("groups", "POST", { name: "gpt" })).status, 409);
    assert.equal((await api("groups", "POST", { name: "gpt", upgradeRoot: true })).status, 201);
    assert.equal((await (await api("links/gpt/home")).json()).link.visits, current.visits);
    await expectTarget("/gpt", "legacy-gpt");
    await expectTarget("/gpt/home", "legacy-gpt");
    assert.equal((await api("links/gpt", "DELETE")).status, 404);
    assert.equal((await api("links/gpt", "PATCH", { url: target("wrong") })).status, 404);
    assert.equal((await api("groups/gpt", "PATCH", { defaultCode: "absent" })).status, 422);
    assert.equal(store.data.get("links/gpt.json").kind, "group");
  });
});

test("an untouched EO node refreshes a switched group within 60s while members keep 24h TTL", async t => {
  const { lookupRoot, lookupLink, resetRedirectState } = await import("../edge-functions/_redirect.js");
  const { MemoryStore } = await import("./memory-store.js");
  const store = new MemoryStore();
  resetRedirectState();
  const spaces = new Map();
  const now = Date.now();
  t.mock.method(Date, "now", () => now);
  t.after(() => { delete globalThis.caches; resetRedirectState(); });
  globalThis.caches = { open: async name => {
    if (!spaces.has(name)) spaces.set(name, new Map());
    const entries = spaces.get(name);
    return {
      match: async key => entries.get(key.url)?.clone(),
      put: async (key, value) => entries.set(key.url, value),
      delete: async key => entries.delete(key.url),
    };
  } };
  const origin = "https://local.example";
  await store.setJSON("links/gome.json", { kind: "group", code: "gome", defaultCode: "one", defaultId: "1" });
  for (const [code, id] of [["one", "1"], ["two", "2"]]) {
    await store.setJSON("links/gome~" + code + ".json", { code: "gome/" + code, id, url: origin + "/target/" + code });
  }
  assert.equal((await lookupRoot(store, "gome", origin)).link.code, "gome/one");
  await lookupLink(store, "gome/one", origin);
  assert.equal(spaces.get("edgeshort-permanent-v2").get(origin + "/gome/one").headers.get("Cache-Control"), "public, max-age=86400");
  assert.equal(spaces.get("edgeshort-root-routing-v2").get(origin + "/gome").headers.get("Cache-Control"), "public, max-age=60");
  // A different node updates Blob and evicts its own cache only.
  await store.setJSON("links/gome.json", { kind: "group", code: "gome", defaultCode: "two", defaultId: "2" });
  resetRedirectState();
  Date.now.mock.mockImplementation(() => now + 59000);
  assert.equal((await lookupRoot(store, "gome", origin)).link.code, "gome/one");
  Date.now.mock.mockImplementation(() => now + 60001);
  assert.equal((await lookupRoot(store, "gome", origin)).link.code, "gome/two");
  assert.equal((await lookupLink(store, "gome/one", origin)).source, "edge");
});
