import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { createInterface } from "node:readline";
import test from "node:test";
import { serve } from "../connector/edgeshort.mjs";
import { createAccount } from "../edge-functions/_accounts.js";
import { startPreview } from "./preview.mjs";

function latch() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t) {
  const app = await startPreview();
  t.after(app.close);
  await createAccount(app.store, { username: "editor", password: "fixture", groups: ["gome"] });
  async function api(path, method, body, cookie) {
    return fetch(app.origin + "/api/" + path, {
      method, headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function login(username, password) {
    const result = await api("auth/login", "POST", { username, password });
    assert.equal(result.status, 200);
    return result.headers.get("set-cookie").split(";")[0];
  }
  const admin = await login("admin", "preview-only");
  const editor = await login("editor", "fixture");
  const { key } = await (await api("api-keys", "POST", { name: "timing" }, editor)).json();
  const input = new PassThrough(), output = new PassThrough();
  const worker = serve(app.origin, key.value, input, output);
  const reader = createInterface({ input: output })[Symbol.asyncIterator]();
  const send = (method, id, params = {}) => input.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  const read = async () => JSON.parse((await reader.next()).value);
  const notifyStarted = latch(), release = latch(), listStarted = latch();
  const forwarded = [];
  const realFetch = globalThis.fetch;
  const control = { failNotification: false };
  t.mock.method(globalThis, "fetch", async (url, init) => {
    if (url !== app.origin + "/api/mcp") return realFetch(url, init);
    const { method } = JSON.parse(init.body);
    forwarded.push(method);
    if (method === "tools/list") listStarted.resolve();
    const response = await realFetch(url, init);
    if (method === "notifications/initialized") {
      notifyStarted.resolve();
      await release.promise;
      if (control.failNotification) return new Response(null, { status: 401 });
    }
    return response;
  });
  t.after(async () => { release.resolve(); input.end(); await worker; output.end(); });
  send("initialize", 1, { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: {name:"test",version:"1"} });
  assert.equal((await read()).result.serverInfo.name, "edgeshort");
  send("notifications/initialized");
  await notifyStarted.promise;
  return {
    send, read, release, listStarted, forwarded, control,
    revokeKey: () => api("api-keys/" + key.id, "DELETE", undefined, editor),
    revokeGroup: () => api("users/editor", "PATCH", { groups: [] }, admin),
  };
}

test("discovery overlaps a pending notification; reads and writes still see live grants", {timeout:10000}, async t => {
  const f = await fixture(t);
  f.send("tools/list", 2);
  await f.listStarted.promise;
  assert.deepEqual(f.forwarded, ["initialize", "notifications/initialized", "tools/list"]);
  f.release.resolve();
  assert.equal((await f.read()).result.tools.length, 5);
  f.send("tools/call", 3, { name:"list_groups", arguments:{} });
  assert.deepEqual((await f.read()).result.structuredContent.groups.map(g => g.name), ["gome"]);
  assert.equal((await f.revokeGroup()).status, 200);
  for (const [id, name, args] of [
    [4, "list_links", {group:"gome"}],
    [5, "create_link", {group:"gome", url:"https://example.org"}],
  ]) {
    f.send("tools/call", id, {name, arguments:args});
    assert.equal((await f.read()).result.structuredContent.status, 403);
  }
  assert.equal((await f.revokeKey()).status, 204);
  f.send("tools/list", 6);
  assert.match((await f.read()).error.message, /401/);
});

test("revoking a key between handshake and first discovery denies the first list", {timeout:10000}, async t => {
  const f = await fixture(t);
  assert.equal((await f.revokeKey()).status, 204);
  f.send("tools/list", 2);
  await f.listStarted.promise;
  f.release.resolve();
  assert.match((await f.read()).error.message, /401/);
});

test("a rejected readiness acknowledgement blocks an immediately following mutation", {timeout:10000}, async t => {
  const f = await fixture(t);
  f.control.failNotification = true;
  f.send("tools/call", 2, {name:"create_link",arguments:{group:"gome",url:"https://example.org"}});
  f.release.resolve();
  assert.match((await f.read()).error.message, /401/);
  assert.ok(!f.forwarded.includes("tools/call"));
});

test("a successful discovery cannot mask an unsuccessful readiness check", {timeout:10000}, async t => {
  const f = await fixture(t);
  f.control.failNotification = true;
  f.send("tools/list", 2);
  await f.listStarted.promise;
  f.release.resolve();
  const reply = await f.read();
  assert.match(reply.error.message, /401/);
  assert.equal(reply.result, undefined);
});
