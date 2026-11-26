import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startPreview } from "./preview.mjs";

test("administrator domain configuration, publishing, host routing and removal", async t => {
  const app = await startPreview();
  t.after(app.close);
  const { origin } = app;

  function client(headers, prefix = "/api") {
    return async (path, method = "GET", body, expected = 200) => {
      const r = await fetch(origin + prefix + path, { method, headers: { ...headers, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body) });
      assert.equal(r.status, expected, method + " " + path);
      return r.json();
    };
  }
  async function login(username, password) {
    const r = await fetch(origin + "/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    assert.equal(r.status, 200);
    return client({ Cookie: r.headers.get("set-cookie").split(";")[0] });
  }
  function visit(host, path) {
    return new Promise((done, fail) => {
      http.get(origin + path, { headers: { Host: host } }, r => {
        r.resume(); done({ status: r.statusCode, to: r.headers.location });
      }).on("error", fail);
    });
  }
  const admin = await login("admin", "preview-only");
  await admin("/groups", "POST", { name: "events" }, 201);
  const password = "preview-local-member";
  const fixtures = [];
  for (const group of ["gome", "events"]) {
    const username = group + "-editor";
    await admin("/users", "POST", { username, groups: [group], password }, 201);
    const session = await login(username, password);
    const { key } = await session("/api-keys", "POST", { name: "domain review" }, 201);
    const api = client({ Authorization: "Bearer " + key.value }, "/api/v1");
    const host = group + ".example.test";
    const target = origin + "/_preview/targets/" + group;
    const endpoint = "/groups/" + group + "/domain";
    fixtures.push({ group, api, session, host, target, endpoint });
    await api("/links", "POST", { group, code: "sale", url: target }, 201);
    await api("/groups/" + group, "PATCH", { defaultCode: "sale" });
    for (const action of ["request", "configure", "approve", "reject", "unbind"]) {
      await session(endpoint, "POST", { action, hostname: host }, 403);
    }
    const plain = (await api("/links/" + group + "/sale")).link;
    assert.equal(plain.brandUrl, null);
    assert.equal(plain.platformUrl, origin + "/" + group + "/sale");
    assert.equal(plain.shortUrl, plain.platformUrl);
    assert.equal((await visit(host, "/sale")).status, 404);
    const { domain } = await admin(endpoint, "POST", { action: "configure", hostname: host.toUpperCase() });
    assert.equal(domain.active.hostname, host);
    assert.equal(domain.pending, null);
  }

  await t.test("same short code on alternating warm requests stays within its group's domain", async () => {
    for (const { host, target } of [...fixtures, ...fixtures]) {
      for (const path of ["/sale", "/"]) assert.deepEqual(await visit(host, path), { status: 302, to: target });
      for (const path of ["/gpt", "/gome/sale", "/admin/", "/api/v1/links"]) assert.equal((await visit(host, path)).status, 404);
    }
  });
  await t.test("all API responses and admin list publish the same primary URL", async () => {
    for (const { group, api, session, host, target } of fixtures) {
      const expected = "https://" + host + "/sale";
      for (const call of [api, session]) {
        const detail = (await call("/links/" + group + "/sale")).link;
        assert.equal(detail.shortUrl, expected);
        assert.equal(detail.brandUrl, expected);
        assert.equal(detail.platformUrl, origin + "/" + group + "/sale");
        const groupInfo = (await call("/groups/" + group)).group;
        assert.equal(groupInfo.domain, undefined);
        assert.equal(groupInfo.platformUrl, origin + "/" + group);
        assert.equal(groupInfo.brandUrl, "https://" + host + "/");
        assert.equal((await call("/links")).links.find(link => link.code === "sale").shortUrl, expected);
        assert.equal((await call("/links/" + group + "/sale", "PATCH", { title: "test" })).link.shortUrl, expected);
        assert.equal((await call("/groups/" + group)).group.shortUrl, "https://" + host + "/");
      }
      const created = await api("/links", "POST", { group, code: "next", url: target }, 201);
      assert.equal(created.link.shortUrl, "https://" + host + "/next");
      const old = await fetch(origin + "/" + group + "/sale", { redirect: "manual" });
      assert.equal(old.headers.get("location"), target);
    }
  });
  await t.test("replacement is atomic, unbound host stops resolving despite warm caches", async () => {
    const [g, e] = fixtures;
    const current = (await admin("/groups/gome")).group.domain.active;
    await admin(e.endpoint, "POST", { action: "configure", hostname: g.host }, 409);
    await admin(g.endpoint, "POST", { action: "configure", hostname: "new.example.test", id: "stale" }, 409);
    assert.equal((await visit(g.host, "/sale")).to, g.target);
    const updated = await admin(g.endpoint, "POST", { action: "configure", hostname: "new.example.test", id: current.id });
    assert.equal((await visit(g.host, "/sale")).status, 404);
    assert.equal((await visit("new.example.test", "/sale")).to, g.target);
    await admin(g.endpoint, "POST", { action: "unbind", id: updated.domain.active.id });
    assert.equal((await visit("new.example.test", "/sale")).status, 404);
    const plain = (await g.api("/links/gome/sale")).link;
    assert.equal(plain.brandUrl, null);
    assert.equal(plain.shortUrl, plain.platformUrl);
    const events = (await admin("/groups/events")).group.domain.active;
    await admin(e.endpoint, "POST", { action: "configure", hostname: g.host, id: events.id });
    assert.equal((await visit(g.host, "/sale")).to, e.target);
  });
  await t.test("existing pending requests remain inert until an administrator decides", async () => {
    const rows = await app.store.get("domains/registry.json");
    const old = { id: "legacy", group: "gome", hostname: "legacy.example.test", status: "pending", requestedBy: "gome-editor" };
    await app.store.setJSON("domains/registry.json", [...rows, old]);
    const memberView = (await fixtures[0].session("/groups/gome")).group;
    assert.equal(memberView.domain, undefined);
    assert.equal(memberView.brandUrl, null);
    assert.equal((await visit(old.hostname, "/sale")).status, 404);
    await fixtures[0].session(fixtures[0].endpoint, "POST", { action: "approve", id: old.id }, 403);
    await admin(fixtures[0].endpoint, "POST", { action: "approve", id: old.id });
    assert.equal((await visit(old.hostname, "/sale")).to, fixtures[0].target);
  });
});
