import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { tools } from "../edge-functions/_mcp-tools.js";

test("the Agent reference includes each public REST operation and MCP tool", async () => {
  const api = new URL("../edge-functions/api/v1/", import.meta.url);
  const spec = JSON.parse(await readFile(new URL("../admin/openapi.json", import.meta.url), "utf8"));
  const guide = await readFile(new URL("../admin/agent-guide.md", import.meta.url), "utf8");
  const names = new Set();
  const expected = new Set();
  for (const file of await readdir(api, { recursive: true })) {
    if (!file.endsWith(".js")) continue;
    const path = "/" + file.replace(/\/index\.js$|\.js$/g, "").replace(/\[([^\]]+)\]/g, "{$1}");
    const handlers = await import(new URL(file, api));
    for (const method of ["Get", "Post", "Patch", "Delete"]) {
      if (handlers["onRequest" + method]) expected.add(method.toLowerCase() + " " + path);
    }
  }
  const documented = new Set();
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (method === "parameters") continue;
      documented.add(method + " " + path);
      assert.ok(operation.operationId && !names.has(operation.operationId));
      names.add(operation.operationId);
    }
  }
  assert.deepEqual(documented, expected);
  for (const tool of tools) assert.ok(guide.includes("| `" + tool.name + "` |"), tool.name);
});
