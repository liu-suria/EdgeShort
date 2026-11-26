// Local-only review server. Route discovery uses the actual Makers handler files.
import { middleware } from "../middleware.js";
import { normalizeDomain } from "../edge-functions/_domain-names.js";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { DiskStore } from "./disk-store.mjs";
import { initialize } from "../edge-functions/_installation.js";
import { changeDomain } from "../edge-functions/_domains.js";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { MemoryStore } from "./memory-store.js";
import { setStoreFactory } from "../edge-functions/_storage.js";
import { resetRedirectState } from "../edge-functions/_redirect.js";
import { createAccount } from "../edge-functions/_accounts.js";
import { createGroup } from "../edge-functions/_groups.js";
import { createLink } from "../edge-functions/_links.js";

const root = new URL("../", import.meta.url);
async function loadRoutes(directory) {
  const handlers = new URL(directory + "/", root);
  const files = await readdir(handlers, { recursive: true });
  return Promise.all(files.filter(file => file.endsWith(".js") && !file.startsWith("_")).map(async file => {
    const parts = file.replace(/\.js$/, "").split("/");
    if (parts.at(-1) === "index") parts.pop();
    const names = [];
    const pattern = parts.map(part => {
      if (!part.startsWith("[")) return part;
      if (part.startsWith("[[")) { names.push(part.slice(2,-2)); return "(.+)"; }
      names.push(part.slice(1, -1));
      return "([^/]+)";
    }).join("/");
    return { regex: new RegExp("^/" + pattern + "/?$"), names, catchAll: file.includes("[["), module: await import(new URL(file, handlers)) };
  }));
}
const routes = (await Promise.all(["edge-functions", "cloud-functions"].map(loadRoutes))).flat();
routes.sort((a, b) => Number(a.catchAll) - Number(b.catchAll) || a.names.length - b.names.length);

const staticFiles = new Set(["index.html", "favicon.ico", "favicon.svg", "apple-touch-icon.png", "admin/index.html", "admin/app.js", "admin/style.css", "admin/qrcode.min.js", "admin/agent-guide.md", "admin/openapi.json", "connector/edgeshort.mjs"]);
const types = { md: "text/plain; charset=utf-8", json: "application/json; charset=utf-8", html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", mjs: "text/javascript", ico: "image/x-icon", svg: "image/svg+xml", png: "image/png" };

async function dispatch(req, trustedLocalSetup) {
  const path = new URL(req.url).pathname;
  let file = path.slice(1);
  if (!file || file.endsWith("/")) file += "index.html";
  let response;
  if (path === "/admin") response = Response.redirect(new URL("/admin/", req.url).href, 301);
  else if (staticFiles.has(file)) {
    response = new Response(await readFile(new URL(file, root)), { headers: { "Content-Type": types[file.split(".").at(-1)] } });
  } else if (path.startsWith("/_preview/targets/")) {
    response = new Response("本地演示目标 · " + path.split("/").at(-1), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } else {
    const route = routes.find(item => item.regex.test(path));
    const method = "onRequest" + req.method[0] + req.method.slice(1).toLowerCase();
    if (!route) response = new Response("Not found", { status: 404 });
    else if (!route.module[method]) response = new Response(null, { status: 405 });
    else {
      const captures = path.match(route.regex).slice(1).map(decodeURIComponent);
      const params = Object.fromEntries(route.names.map((name, i) => [name, captures[i]]));
      const waits = [];
      response = await route.module[method]({ request: req, params, trustedLocalSetup, waitUntil: p => waits.push(p) });
      await Promise.allSettled(waits);
    }
  }
  return response;
}

export async function startPreview(port = 0, { store = new MemoryStore(), fresh = false, localSetup = false } = {}) {
  setStoreFactory(() => store);
  resetRedirectState();
  if (!fresh) await initialize(store, { trustedLocalSetup: true }, { username: "admin", password: "preview-only" });
  let origin;
  const server = createServer(async (incoming, outgoing) => {
    try {
      const address = new URL("http://" + incoming.headers.host);
      const testHost = normalizeDomain(address.hostname, true) && /\.(test|localhost)$/.test(address.hostname);
      if ((address.origin !== origin && !testHost) || !incoming.url.startsWith("/") || incoming.url.startsWith("//")
          || (incoming.headers.origin && incoming.headers.origin !== address.origin)) {
        outgoing.writeHead(403).end(); return;
      }
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const req = new Request(new URL(incoming.url, address.origin), {
        method: incoming.method, headers: incoming.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
      });
      const trustedLocalSetup = localSetup && address.origin === origin && new URL(req.url).origin === origin;
      const response = await middleware({ request: req, next: () => dispatch(req, trustedLocalSetup),
        rewrite: path => dispatch(new Request(new URL(path, req.url), { method: req.method }), false) });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error(error.message);
      outgoing.writeHead(500).end();
    }
  });
  await new Promise((done, fail) => server.once("error", fail).listen(port, "127.0.0.1", done));
  origin = "http://127.0.0.1:" + server.address().port;
  const app = { origin, store, close: () => new Promise(done => server.close(done)) };
  if (fresh) return app;
  // Seed an old-format row directly, without using the new create API.
  const target = value => origin + "/_preview/targets/" + value;
  await store.setJSON("links/gpt.json", { id: "legacy-gpt", code: "gpt", url: target("legacy-gpt"), title: "历史根短链", visits: 7, createdAt: "2026-01-01T00:00:00Z" });
  await createGroup(store, { name: "gome" }, origin);
  for (const code of ["summer", "winter", "xxxxx"]) {
    await createLink(store, { group: "gome", code, url: target(code), title: code }, { origin });
  }
  const group = store.data.get("links/gome.json");
  group.defaultCode = "summer";
  group.defaultId = store.data.get("links/gome~summer.json").id;
  return app;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || "")) {
  const port = Number(process.argv[2]) || 4179;
  const fresh = process.argv.includes("--fresh");
  const app = await startPreview(port, fresh ? {
    fresh, localSetup: true, store: new DiskStore(resolve(tmpdir(), "edgeshort-local-" + port)),
  } : {});
  if (!fresh) await seedDomainDemo(app);
  console.log("EdgeShort local review · " + app.origin + "/admin/");
}

async function seedDomainDemo(app) {
  // Fixtures belong exclusively to this loopback review server.
  await createGroup(app.store, { name: "events" }, app.origin);
  await createLink(app.store, { group: "events", code: "launch", url: app.origin + "/_preview/targets/launch" }, { origin: app.origin });
  for (const group of ["gome", "events"]) {
    await createLink(app.store, { group, code: "sale", title: group + " · 同码测试", url: app.origin + "/_preview/targets/" + group + "-sale" }, { origin: app.origin });
    const username = group + "-editor";
    await createAccount(app.store, { username, groups: [group], password: "review-groups-local" });
    await changeDomain(app.store, group, { action: "configure", hostname: group + ".localhost" },
      { username: "admin", role: "admin" }, app.origin);
    const row = app.store.data.get("links/" + group + ".json");
    row.defaultCode = "sale";
    row.defaultId = app.store.data.get("links/" + group + "~sale.json").id;
  }

}
