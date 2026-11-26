import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DiskStore } from "./disk-store.mjs";
import { MemoryStore } from "./memory-store.js";
import { startPreview } from "./preview.mjs";
import { getInstallation } from "../edge-functions/_installation.js";

test("fresh install: protected one-time setup, generated secret and persistent admin login", async t => {
  const directory = await mkdtemp(join(tmpdir(), "edgeshort-setup-test-"));
  const store = new DiskStore(directory);
  let app = await startPreview(0, { fresh: true, store });
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  const send = (path, body, cookie) => fetch(app.origin + "/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Connection: "close", "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const credentials = { username: "site-owner", password: "local-test-password-01" };
  assert.deepEqual(await (await send("auth/session")).json(), { authenticated: false, needsSetup: true, needsProof: true });
  assert.equal((await send("auth/login", credentials)).status, 409);
  assert.equal((await send("auth/setup", credentials)).status, 403);
  const [marker] = (await store.list({ prefix: "setup/" })).blobs;
  const code = marker.key.slice(6, -5);
  const results = await Promise.all([0, 1].map(() => send("auth/setup", { ...credentials, setupCode: code })));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  const created = results.find(r => r.status === 201);
  assert.deepEqual(await created.json(), { ok: true });
  const cookie = created.headers.get("set-cookie").split(";")[0];
  const config = await store.get("system/installation.json");
  assert.equal(config.username, credentials.username);
  assert.ok(/^[A-Za-z0-9_-]{43}$/.test(config.sessionSecret));
  assert.ok(config.digest !== credentials.password && !JSON.stringify(config).includes(credentials.password));
  assert.equal((await store.list({ prefix: "setup/" })).blobs.length, 0);
  assert.equal((await send("auth/setup", credentials)).status, 409);
  // Restart with a fresh server and a newly opened store on the same private directory.
  const oldPort = Number(new URL(app.origin).port);
  await app.close();
  app = await startPreview(oldPort, { fresh: true, store: new DiskStore(directory) });
  const restored = await (await send("auth/session", undefined, cookie)).json();
  assert.equal(restored.user.username, "site-owner");
  assert.equal(restored.user.role, "admin");
  assert.equal((await send("auth/login", { ...credentials, username: "admin" })).status, 401);
  assert.equal((await send("auth/login", credentials)).status, 200);
  assert.equal((await send("users", { ...credentials, groups: [] }, cookie)).status, 409);
  const key = (await (await send("api-keys", { name: "after restart" }, cookie)).json()).key;
  const list = await fetch(app.origin + "/api/v1/groups", { headers: { Authorization: "Bearer " + key.value } });
  assert.equal(list.status, 200);
  assert.equal((await (await send("api-keys", undefined, cookie)).json()).keys[0].id, key.id);
});

test("an empty store requires first setup even with obsolete environment variables", async () => {
  const store = new MemoryStore();
  const { onRequestGet } = await import("../edge-functions/api/auth/session.js");
  const { setStoreFactory } = await import("../edge-functions/_storage.js");
  setStoreFactory(() => store);
  const r = await onRequestGet({ request: new Request("https://vyu.cc/api/auth/session"), env: {
    ADMIN_PASSWORD: "discarded-test-value", SESSION_SECRET: "discarded-test-key",
  } });
  assert.deepEqual(await r.json(), { authenticated: false, needsSetup: true, needsProof: true });
  assert.equal(await getInstallation(store), null);
});

test("two fresh installations have independent signing keys", async () => {
  const a = await startPreview(0, { fresh: true, localSetup: true });
  const setup = async app => {
    const response = await fetch(app.origin + "/api/auth/setup", { method: "POST", body: JSON.stringify({ username: "admin", password: "preview-only" }) });
    assert.equal(response.status, 201);
    return (await app.store.get("system/installation.json")).sessionSecret;
  };
  let first;
  try { first = await setup(a); } finally { await a.close(); }
  const b = await startPreview(0, { fresh: true, localSetup: true });
  try { assert.ok(first !== await setup(b)); } finally { await b.close(); }
});

test("setup, member creation and login accept short and formerly over-limit credentials", async () => {
  const short = { username: "x", password: "1" };
  const long = { username: "u".repeat(64), password: "p".repeat(300) };
  for (const [administrator, member] of [[short, long], [long, short]]) {
    const app = await startPreview(0, { fresh: true, localSetup: true });
    const post = (path, body, cookie) => fetch(app.origin + "/api/" + path, {
      method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
    try {
      assert.equal((await post("auth/setup", { ...administrator, password: "" })).status, 422);
      assert.equal((await post("auth/setup", administrator)).status, 201);
      const login = await post("auth/login", administrator);
      assert.equal(login.status, 200);
      const cookie = login.headers.get("set-cookie").split(";")[0];
      assert.equal((await post("users", { ...member, password: "" }, cookie)).status, 422);
      assert.equal((await post("users", member, cookie)).status, 201);
      const memberLogin = await post("auth/login", member);
      assert.equal(memberLogin.status, 200);
      const session = await fetch(app.origin + "/api/auth/session", {
        headers: { Cookie: memberLogin.headers.get("set-cookie").split(";")[0] },
      });
      assert.equal((await session.json()).user.username, member.username);
    } finally { await app.close(); }
  }
});
