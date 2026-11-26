import assert from "node:assert/strict";
import test from "node:test";
import { startPreview } from "./preview.mjs";

test("two members have live group-scoped access", async t => {
  const app = await startPreview();
  t.after(app.close);
  const client = (headers = {}, prefix = "/api") => async (path, method = "GET", body, status = 200) => {
    const response = await fetch(app.origin + prefix + path, { method, redirect: "manual",
      headers: { ...headers, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    assert.equal(response.status, status, method + " " + prefix + path);
    return response.status === 204 ? null : response.json();
  };
  async function login(username, password) {
    const response = await fetch(app.origin + "/api/auth/login", { method: "POST",
      body: JSON.stringify({ username, password }), headers: { "Content-Type": "application/json" } });
    assert.equal(response.status, 200);
    return client({ Cookie: response.headers.get("set-cookie").split(";")[0] });
  }
  const admin = await login("admin", "preview-only");
  const users = [
    { username: "gome-editor", group: "gome", other: "events" },
    { username: "events-editor", group: "events", other: "gome" },
  ];
  const password = "local-account-test";
  await admin("/groups", "POST", { name: "events" }, 201);
  for (const user of users) {
    const { username, group } = user;
    await admin("/users", "POST", { username, password, groups: [group] }, 201);
    user.session = await login(username, password);
    const { key } = await user.session("/api-keys", "POST", { name: "review" }, 201);
    user.keyId = key.id;
    user.api = client({ Authorization: "Bearer " + key.value }, "/api/v1");
    await user.api("/links", "POST", { group, code: "shared", url: "https://example.com/" + group }, 201);
  }
  for (const user of users) {
    await t.test(user.username + " session and Key only manage " + user.group, async () => {
      const { group, other, session, api } = user;
      for (const call of [session, api]) {
        assert.deepEqual((await call("/groups")).groups.map(x => x.name), [group]);
        const listing = await call("/links");
        assert.ok(listing.links.length > 0 && listing.links.every(x => x.group === group));
        assert.equal(listing.total, listing.links.length);
        await call("/links/" + group + "/shared", "PATCH", { title: "owned" });
        await call("/groups/" + group, "PATCH", { defaultCode: "shared" });
        await call("/links", "POST", { group, code: "temp", url: "https://example.com/temp", expiresAt: 1 }, 201);
        await call("/links/" + group + "/temp", "DELETE", undefined, 204);
        await call("/links?group=" + other, "GET", undefined, 403);
        await call("/links/" + other + "/shared", "GET", undefined, 403);
        await call("/links/" + other + "/shared", "PATCH", { title: "unavailable" }, 403);
        await call("/links/" + other + "/shared", "DELETE", undefined, 403);
        await call("/links/" + group + "/shared", "PATCH", { group: other }, 403);
        await call("/links", "POST", { group: other, url: "https://example.com" }, 403);
        await call("/links/gpt", "GET", undefined, 403);
        await call("/links", "POST", { url: "https://example.com" }, 403);
        await call("/groups/" + other, "PATCH", { defaultCode: null }, 403);
        await call("/groups", "POST", { name: "newgroup" }, 403);
      }
      const foreignKey = users.find(x => x !== user).keyId;
      assert.deepEqual((await session("/api-keys")).keys.map(k => k.id), [user.keyId]);
      await session("/api-keys/" + foreignKey, "DELETE", undefined, 404);
      await session("/users", "GET", undefined, 403);
      await session("/users/" + user.username, "PATCH", { groups: [other] }, 403);
    });
  }
  await t.test("revocation removes membership from existing session and existing Key, preserves another grant", async () => {
    const [first, second] = users;
    await admin("/users/" + first.username, "PATCH", { groups: ["gome", "events"] });
    assert.equal((await first.api("/links/gome/shared")).link.title, "owned");
    await admin("/users/" + first.username, "PATCH", { groups: ["events"] });
    for (const call of [first.api, first.session]) {
      assert.deepEqual((await call("/groups")).groups.map(g => g.name), ["events"]);
      assert.ok((await call("/links")).links.every(link => link.group === "events"));
      await call("/links/gome/shared", "GET", undefined, 403);
      await call("/links/gome/shared", "PATCH", { title: "revoked" }, 403);
      await call("/groups/gome", "PATCH", { defaultCode: null }, 403);
      await call("/links/events/shared", "PATCH", { title: "still allowed" });
    }
    assert.equal((await second.api("/links/events/shared")).link.title, "still allowed");
    await admin("/users/" + first.username, "PATCH", { groups: [] });
    assert.equal((await first.api("/links")).total, 0);
    assert.deepEqual((await first.session("/groups")).groups, []);
    const publicLink = await fetch(app.origin + "/gome/shared", { redirect: "manual" });
    assert.equal(publicLink.status, 302);
  });
  await t.test("disabling an account blocks both credentials and preserves the other account", async () => {
    await admin("/users/" + users[1].username, "PATCH", { enabled: false });
    await users[1].api("/links", "GET", undefined, 401);
    await users[1].session("/links", "GET", undefined, 401);
    assert.equal((await users[0].session("/auth/session")).authenticated, true);
    await admin("/users/" + users[1].username, "PATCH", { enabled: true });
    await users[1].session("/links", "GET", undefined, 401);
    assert.ok((await (await login(users[1].username, password))("/auth/session")).authenticated);
  });
});
