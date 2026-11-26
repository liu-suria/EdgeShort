import assert from "node:assert/strict";
import test from "node:test";
import { startPreview } from "./preview.mjs";

test("device pairing binds a private proof to one approved account and one redemption", async (t) => {
  const app = await startPreview();
  t.after(app.close);
  const request = (path, body, headers = {}) =>
    fetch(app.origin + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  async function login(username, password) {
    const r = await request("/api/auth/login", { username, password });
    assert.equal(r.status, 200);
    return { Cookie: r.headers.get("set-cookie").split(";")[0] };
  }
  const admin = await login("admin", "preview-only");
  await request("/api/users", { username: "editor", password: "test", groups: ["gome"] }, admin);
  const user = await login("editor", "test");
  async function begin() {
    const r = await request("/api/device/start", { clientName: "Test connector" });
    assert.equal(r.status, 201);
    return r.json();
  }
  const authorize = (body, headers = user) => request("/api/device/authorize", body, headers);
  const exchange = (code) => request("/api/device/exchange", { device_code: code });
  const call = (token, tool, args) =>
    request(
      "/api/mcp",
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } },
      { Authorization: "Bearer " + token },
    );

  const grant = await begin();
  assert.equal(grant.expires_in, 300);
  const identify = { user_code: grant.user_code, action: "inspect" };
  assert.equal((await authorize(identify, {})).status, 401);
  const view = await (await authorize(identify)).json();
  assert.deepEqual(view.groups, ["gome"]);
  assert.equal(view.clientName, "Test connector");
  assert.ok(!JSON.stringify(view).includes(grant.device_code));
  assert.equal((await (await exchange(grant.device_code)).json()).error, "authorization_pending");
  assert.equal((await exchange(grant.user_code)).status, 400);
  const approval = { user_code: grant.user_code, pairId: view.pairId, action: "approve" };
  assert.equal((await authorize({ ...approval, pairId: "stale" })).status, 409);
  assert.equal((await authorize(approval)).status, 200);
  assert.equal((await authorize(approval, admin)).status, 409);
  assert.equal(
    (await exchange(grant.device_code.slice(0, -1) + (grant.device_code.endsWith("A") ? "B" : "A"))).status,
    400,
  );
  const competing = await Promise.all([exchange(grant.device_code), exchange(grant.device_code)]);
  assert.deepEqual(competing.map((r) => r.status).sort(), [200, 409]);
  const { access_token: token, key_id: id } = await competing.find((r) => r.ok).json();
  assert.equal(id, view.pairId);
  assert.equal((await exchange(grant.device_code)).status, 409);
  const publicKeys = (await (await request("/api/api-keys", undefined, user)).json()).keys;
  assert.equal(publicKeys.length, 1);
  assert.equal(publicKeys[0].source, "device");
  assert.ok(!JSON.stringify(publicKeys).includes(token));
  assert.ok(!JSON.stringify([...app.store.data]).includes(token));
  assert.ok(!JSON.stringify([...app.store.data]).includes(grant.device_code.split(".")[1]));
  const result = await (await call(token, "list_groups", {})).json();
  assert.deepEqual(
    result.result.structuredContent.groups.map((g) => g.name),
    ["gome"],
  );
  const patch = await fetch(app.origin + "/api/users/editor", {
    method: "PATCH",
    headers: { ...admin, "Content-Type": "application/json" },
    body: JSON.stringify({ groups: [] }),
  });
  assert.equal(patch.status, 200);
  const denied = await (
    await call(token, "create_link", { group: "gome", url: "https://example.org" })
  ).json();
  assert.equal(denied.result.structuredContent.status, 403);
  assert.deepEqual((await (await call(token, "list_groups", {})).json()).result.structuredContent.groups, []);
  assert.equal(
    (await fetch(app.origin + "/api/api-keys/" + id, { method: "DELETE", headers: user })).status,
    204,
  );
  assert.equal((await call(token, "list_groups", {})).status, 401);
  assert.notEqual((await exchange(grant.device_code)).status, 200);

  const refused = await begin();
  const second = await (await authorize({ action: "inspect", user_code: refused.user_code })).json();
  await authorize({ action: "deny", user_code: refused.user_code, pairId: second.pairId });
  assert.equal((await exchange(refused.device_code)).status, 403);

  const expired = await begin();
  const now = Date.now();
  t.mock.method(Date, "now", () => now + 301000);
  assert.equal((await authorize({ action: "inspect", user_code: expired.user_code })).status, 404);
  assert.equal((await exchange(expired.device_code)).status, 400);
});
