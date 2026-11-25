import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { MemoryStore } from "./memory-store.js";
import { setStoreFactory } from "../edge-functions/_storage.js";
import { recordVisit, resetRedirectState } from "../edge-functions/_redirect.js";
import { createLink, deleteLink, getLink, listLinks, updateLink } from "../edge-functions/_links.js";
import { onRequestGet as redirect } from "../edge-functions/[code].js";
import { onRequestPost as login } from "../edge-functions/api/auth/login.js";
import { onRequestPost as createKey } from "../edge-functions/api/api-keys/index.js";
import { onRequestDelete as revokeKey } from "../edge-functions/api/api-keys/[id].js";
import { onRequestGet as v1List, onRequestPost as v1Create } from "../edge-functions/api/v1/links/index.js";
import { onRequestPatch as v1Patch } from "../edge-functions/api/v1/links/[code].js";
import { createSession, COOKIE_NAME } from "../edge-functions/_lib.js";

let store;
const env = { ADMIN_PASSWORD: "correct horse", SESSION_SECRET: "s".repeat(40) };
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  store = new MemoryStore();
  setStoreFactory(() => store);
  resetRedirectState();
});

function request(url, init = {}) {
  return new Request(`https://x.test${url}`, init);
}
function ctx(req, params = {}, extra = {}) {
  const waits = [];
  return { request: req, params, env, waitUntil: (p) => waits.push(p), waits, ...extra };
}
async function adminCtx(url, init = {}, params = {}) {
  const cookie = `${COOKIE_NAME}=${await createSession(env.SESSION_SECRET)}`;
  return ctx(request(url, { ...init, headers: { cookie, "content-type": "application/json", ...(init.headers || {}) } }), params);
}

describe("redirect", () => {
  test("302 to destination, counts the visit in a separate blob", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc" });
    const c = ctx(request("/abc"), { code: "abc" });
    const res = await redirect(c);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "https://example.com/a");
    await Promise.all(c.waits);
    assert.equal((await getLink(store, "abc")).link.visits, 1);
    assert.equal(store.data.get("links/abc.json").visits, undefined, "link record is never rewritten by counting");
  });

  test("hot path reads storage once, then serves from cache", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc" });
    const first = ctx(request("/abc"), { code: "abc" });
    await redirect(first);
    await Promise.all(first.waits);
    store.reads = 0;
    for (let i = 0; i < 20; i += 1) await redirect(ctx(request("/abc"), { code: "abc" }));
    assert.equal(store.reads, 0);
  });

  test("visits are coalesced into few writes", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc" });
    const c = ctx(request("/abc"), { code: "abc" });
    for (let i = 0; i < 50; i += 1) await redirect(ctx(request("/abc"), { code: "abc" }, { waitUntil: c.waitUntil }));
    await Promise.all(c.waits);
    store.writes = 0;
    for (let i = 0; i < 50; i += 1) await redirect(ctx(request("/abc"), { code: "abc" }, { waitUntil: c.waitUntil }));
    await Promise.all(c.waits);
    assert.equal(store.writes, 0, "no extra counter writes inside the flush window");
  });

  test("junk paths 404 without touching storage; missing 404; expired 410", async () => {
    store.reads = 0;
    assert.equal((await redirect(ctx(request("/favicon.ico"), { code: "favicon.ico" }))).status, 404);
    assert.equal((await redirect(ctx(request("/admin"), { code: "admin" }))).status, 404);
    assert.equal(store.reads, 0);
    assert.equal((await redirect(ctx(request("/nope"), { code: "nope" }))).status, 404);
    await store.setJSON("links/old.json", { id: "1", code: "old", url: "https://e.com/", expiresAt: new Date(Date.now() - 1000).toISOString() });
    assert.equal((await redirect(ctx(request("/old"), { code: "old" }))).status, 410);
  });

  test("each failure shows its own branded page", async () => {
    const page = async (code, kind) => {
      const res = await redirect(ctx(request("/" + code), { code }));
      return { status: res.status, html: await res.text(), kind };
    };
    const invalid = await page("bad.code", "invalid");
    assert.equal(invalid.status, 404);
    assert.match(invalid.html, /链接无效/);
    assert.match((await page("nope", "missing")).html, /链接不存在/);
    await store.setJSON("links/old.json", { id: "1", code: "old", url: "https://e.com/", expiresAt: new Date(Date.now() - 1000).toISOString() });
    const expired = await page("old", "expired");
    assert.equal(expired.status, 410);
    assert.match(expired.html, /链接已过期/);
    store.get = async () => { throw new Error("boom"); };
    const failed = await page("zzz", "error");
    assert.equal(failed.status, 503);
    assert.match(failed.html, /暂时无法访问/);
    assert.ok(!failed.html.includes("boom"));
  });

  test("creating a duplicate code returns 409, not a 500", async () => {
    await createLink(store, { url: "https://example.com/a", code: "dup" });
    await assert.rejects(createLink(store, { url: "https://example.com/b", code: "dup" }), { status: 409 });
  });

  test("a visit for a link that no longer exists never recreates its counter", async () => {
    const waits = [];
    recordVisit(store, "ghost", (p) => waits.push(p));
    await Promise.all(waits);
    assert.equal(store.data.has("visits/ghost.json"), false);
  });
});

describe("links service", () => {
  test("editing never loses or resets visits; PATCH only changes given fields", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc", title: "T" });
    await store.setJSON("visits/abc.json", { count: 7 });
    const { link } = await updateLink(store, "abc", { url: "https://example.com/b" });
    assert.equal(link.title, "T");
    assert.equal(link.visits, 7);
    assert.equal(store.data.get("visits/abc.json").count, 7);
  });

  test("legacy in-record visits are still counted", async () => {
    await store.setJSON("links/old.json", { id: "1", code: "old", url: "https://e.com/", visits: 5, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" });
    await store.setJSON("visits/old.json", { count: 2 });
    assert.equal((await listLinks(store)).links[0].visits, 7);
  });

  test("renaming moves the counter and frees the old code; duplicates conflict", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc" });
    await createLink(store, { url: "https://example.com/b", code: "taken" });
    await store.setJSON("visits/abc.json", { count: 4 });
    await assert.rejects(updateLink(store, "abc", { code: "taken" }), { status: 409 });
    const { link } = await updateLink(store, "abc", { code: "xyz" });
    assert.equal(link.visits, 4);
    assert.equal(store.data.has("links/abc.json"), false);
    assert.equal(store.data.has("visits/abc.json"), false);
  });

  test("a failed rename can be retried with new fields and keeps the counter", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc" });
    await store.setJSON("visits/abc.json", { count: 17 });
    const realDelete = store.delete.bind(store);
    store.delete = async (key) => { if (key === "links/abc.json") throw new Error("flaky"); return realDelete(key); };
    await assert.rejects(updateLink(store, "abc", { code: "xyz", url: "https://example.com/a" }));
    store.delete = realDelete;
    const { link } = await updateLink(store, "abc", { code: "xyz", url: "https://example.com/b" });
    assert.equal(link.url, "https://example.com/b");
    assert.equal(link.visits, 17);
    assert.equal(store.data.get("links/xyz.json").url, "https://example.com/b");
  });

  test("one unreadable counter does not break listing", async () => {
    await createLink(store, { url: "https://example.com/a", code: "abc" });
    await store.setJSON("visits/abc.json", { count: 3 });
    const realGet = store.get.bind(store);
    store.get = async (key, ...rest) => { if (key.startsWith("visits/")) throw new Error("bad"); return realGet(key, ...rest); };
    assert.equal((await listLinks(store)).total, 1);
  });

  test("validation errors", async () => {
    await assert.rejects(createLink(store, { url: "javascript:alert(1)" }), { status: 422 });
    await assert.rejects(createLink(store, { url: "https://e.com", code: "admin" }), { status: 422 });
    await assert.rejects(createLink(store, { url: "https://e.com", expiresAt: 0 }), { status: 422 });
    await assert.rejects(updateLink(store, "missing", {}), { status: 404 });
  });
});

describe("admin auth and login limiter", () => {
  test("admin API needs a session", async () => {
    const { onRequestGet } = await import("../edge-functions/api/links/index.js");
    assert.equal((await onRequestGet(ctx(request("/api/links")))).status, 401);
    assert.equal((await onRequestGet(await adminCtx("/api/links"))).status, 200);
  });

  test("locks out after 5 wrong passwords, success resets", async () => {
    const attempt = (password) => login(ctx(request("/api/auth/login", { method: "POST", body: JSON.stringify({ password }), headers: { "EO-Connecting-IP": "1.2.3.4" } })));
    for (let i = 0; i < 4; i += 1) assert.equal((await attempt("bad")).status, 401);
    assert.equal((await attempt(env.ADMIN_PASSWORD)).status, 200);
    for (let i = 0; i < 5; i += 1) assert.equal((await attempt("bad")).status, 401);
    const locked = await attempt(env.ADMIN_PASSWORD);
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers.get("retry-after")) > 0);
  });
});

describe("public API", () => {
  async function newKey() {
    const res = await createKey(await adminCtx("/api/api-keys", { method: "POST", body: JSON.stringify({ name: "t" }) }));
    assert.equal(res.status, 201);
    return (await res.json()).key;
  }
  const bearer = (value) => ({ authorization: `Bearer ${value}` });

  test("new key authenticates with one direct lookup; revoke works; garbage rejected", async () => {
    const key = await newKey();
    assert.match(key.value, /^esk_[0-9a-f]{16}\.[A-Za-z0-9_-]{43}$/);
    assert.equal((await v1List(ctx(request("/api/v1/links", { headers: bearer(key.value) })))).status, 200);
    store.reads = 0;
    await v1List(ctx(request("/api/v1/links", { headers: bearer(key.value) })));
    assert.equal(store.data.has("api-key-usage/" + key.id + ".json"), true);
    assert.equal((await v1List(ctx(request("/api/v1/links", { headers: bearer(key.value.slice(0, -1) + "x") })))).status, 401);
    assert.equal((await v1List(ctx(request("/api/v1/links", { headers: bearer("esk_nope_nope_nope_nope_nope") })))).status, 401);
    assert.equal((await revokeKey(await adminCtx(`/api/api-keys/${key.id}`, { method: "DELETE" }, { id: key.id }))).status, 204);
    assert.equal((await v1List(ctx(request("/api/v1/links", { headers: bearer(key.value) })))).status, 401);
  });

  test("legacy keys (no embedded id) still work", async () => {
    const value = "esk_" + "A".repeat(43);
    const { hashSecret } = await import("../edge-functions/_lib.js");
    await store.setJSON("api-keys/legacy.json", { id: "legacy", name: "old", prefix: value.slice(0, 12), hash: await hashSecret(value), createdAt: "2026-01-01T00:00:00Z" });
    assert.equal((await v1List(ctx(request("/api/v1/links", { headers: bearer(value) })))).status, 200);
  });

  test("CORS headers, create 201, patch keeps unspecified fields, 204 delete has no body", async () => {
    const key = await newKey();
    const headers = { ...bearer(key.value), "content-type": "application/json" };
    const created = await v1Create(ctx(request("/api/v1/links", { method: "POST", headers, body: JSON.stringify({ url: "https://example.com", code: "k1", title: "hello" }) })));
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("access-control-allow-origin"), "*");
    const patched = await v1Patch(ctx(request("/api/v1/links/k1", { method: "PATCH", headers, body: JSON.stringify({ expiresAt: 3 }) }), { code: "k1" }));
    const body = await patched.json();
    assert.equal(body.link.title, "hello");
    assert.ok(body.link.expiresAt);
    const { onRequestDelete } = await import("../edge-functions/api/v1/links/[code].js");
    const del = await onRequestDelete(ctx(request("/api/v1/links/k1", { method: "DELETE", headers }), { code: "k1" }));
    assert.equal(del.status, 204);
    assert.equal(await del.text(), "");
  });

  test("server errors do not leak internals", async () => {
    const key = await newKey();
    store.list = async () => { throw new Error("secret-internal-detail"); };
    const res = await v1List(ctx(request("/api/v1/links", { headers: bearer(key.value) })));
    assert.equal(res.status, 500);
    assert.ok(!(await res.text()).includes("secret-internal-detail"));
  });
});
