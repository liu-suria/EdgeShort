import test from "node:test";
import assert from "node:assert/strict";
import { startPreview } from "./preview.mjs";

test("dashboard bootstrap, new group and confirmed root upgrade use the authoritative responses", async t => {
  const app = await startPreview();
  t.after(app.close);
  let cookie;
  const call = (path, method = "GET", body) => fetch(app.origin + "/api/" + path, {
    method, headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal((await (await call("auth/session?dashboard=1")).json()).page, undefined);
  cookie = (await call("auth/login","POST",{username:"admin",password:"preview-only"})).headers.get("set-cookie").split(";")[0];
  const boot = await (await call("auth/session?dashboard=1")).json();
  const first = await (await call("links?limit=20")).json();
  assert.equal(boot.user.role, "admin"); assert.deepEqual(boot.page, first);
  assert.equal((await (await call("auth/session")).json()).page, undefined);
  const group = await call("groups","POST",{name:"newgroup"});
  assert.equal(group.status,201); assert.equal((await group.json()).group.name,"newgroup");
  const conflict = await call("groups","POST",{name:"gpt"});
  assert.equal(conflict.status,409);
  const {details} = await conflict.json(); assert.equal(details.reason,"root_exists");
  await call("links/gpt","PATCH",{url:"https://example.org/changed"});
  assert.equal((await call("groups","POST",{name:"gpt",upgradeRoot:true,expectedRoot:details})).status,409);
  assert.equal((await (await call("links/gpt")).json()).link.url,"https://example.org/changed");
  const fresh = (await (await call("groups","POST",{name:"gpt"})).json()).details;
  assert.equal((await call("groups","POST",{name:"gpt",upgradeRoot:true,expectedRoot:fresh})).status,201);
  assert.equal((await (await call("links/gpt/home")).json()).link.url,"https://example.org/changed");
});
