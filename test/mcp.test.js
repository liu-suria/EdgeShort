import test from "node:test";
import assert from "node:assert/strict";
import { startPreview } from "./preview.mjs";
import { createAccount } from "../edge-functions/_accounts.js";
import { changeDomain } from "../edge-functions/_domains.js";

test("MCP publishes branded links and rechecks every tool call after revocation", async t => {
  const app = await startPreview();
  t.after(app.close);
  const { origin, store } = app;
  const admin = { role: "admin", username: "admin" };
  const editor = { role: "member", username: "gome-editor", groups: ["gome"] };
  await createAccount(store, { ...editor, password: "local-review" });
  await changeDomain(store, "gome", { action: "configure", hostname: "gome.localhost" }, admin, origin);

  async function api(path, method, body, cookie) {
    return fetch(origin + "/api/" + path, { method, headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
      body: body && JSON.stringify(body) });
  }
  const login = async (username, password) => (await api("auth/login", "POST", { username, password })).headers.get("set-cookie").split(";")[0];
  const memberCookie = await login(editor.username, "local-review");
  const adminCookie = await login(admin.username, "preview-only");
  const { key } = await (await api("api-keys", "POST", { name: "mcp-test" }, memberCookie)).json();

  const endpoint = origin + "/api/mcp";
  const headers = { Authorization: "Bearer " + key.value, "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  let id = 0;
  async function rpc(method, params = {}) {
    const requestId = ++id;
    const r = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ id: requestId, jsonrpc: "2.0", method, params }) });
    assert.equal(r.status, 200);
    const payload = await r.json();
    assert.equal(payload.id, requestId);
    return payload;
  }
  const call = async (name, args) => (await rpc("tools/call", { name, arguments: args })).result;
  const initialized = await rpc("initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "review", version: "1" } });
  headers["MCP-Protocol-Version"] = initialized.result.protocolVersion;
  const notify = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) });
  assert.equal(notify.status, 202);
  assert.deepEqual((await rpc("tools/list")).result.tools.map(x => x.name), ["list_groups","list_links","create_link","update_link","set_group_default"]);
  assert.deepEqual((await call("list_groups", {})).structuredContent.groups.map(g => g.name), ["gome"]);
  const data = { group: "gome", code: "review", url: origin + "/_preview/targets/mcp" };
  const created = await call("create_link", data);
  assert.equal(created.isError, false);
  const branded = "http://gome.localhost:" + new URL(origin).port + "/review";
  assert.equal(created.structuredContent.link.shortUrl, branded);
  assert.equal(created.structuredContent.link.brandUrl, branded);
  assert.equal(created.structuredContent.link.platformUrl, origin + "/gome/review");
  assert.equal((await (await api("links/gome/review", "GET", undefined, memberCookie)).json()).link.shortUrl, branded);
  assert.equal((await call("update_link", { group:"gome", code:"review", title:"approved" })).structuredContent.link.title, "approved");
  assert.equal((await call("set_group_default", { group:"gome", defaultCode:"review" })).structuredContent.group.defaultCode, "review");
  assert.equal((await call("list_links", { group:"gome", q:"approved" })).structuredContent.total, 1);
  assert.equal((await rpc("tools/call", { name:"create_link", arguments:{...data, bogus:true} })).error.code, -32602);
  assert.equal((await call("list_links", { group:"other" })).structuredContent.status, 403);

  assert.equal((await api("users/gome-editor", "PATCH", { groups:[] }, adminCookie)).status, 200);
  assert.deepEqual((await call("list_groups", {})).structuredContent.groups, []);
  assert.equal((await call("list_links", {})).structuredContent.total, 0);
  for (const [name, args] of [
    ["list_links", { group:"gome" }], ["create_link", {...data, code:"denied"}],
    ["update_link", {group:"gome", code:"review", title:"denied"}], ["set_group_default", {group:"gome", defaultCode:null}],
  ]) {
    const result = await call(name, args);
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent.status, 403);
  }
  assert.equal((await api("links/gome/denied", "GET", undefined, adminCookie)).status, 404);
  assert.equal((await (await api("links/gome/review", "GET", undefined, adminCookie)).json()).link.title, "approved");
  assert.equal((await (await api("groups/gome", "GET", undefined, adminCookie)).json()).group.defaultCode, "review");
  assert.equal((await fetch(endpoint, { method:"POST" })).status, 401);
  assert.equal((await fetch(endpoint, { method:"POST", headers:{...headers,"MCP-Protocol-Version":"unsupported"} })).status, 400);
  assert.equal((await fetch(endpoint)).status, 405);
});
