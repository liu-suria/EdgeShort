import { requireApiKey } from "../../_api.js";
import { json } from "../../_lib.js";
import { isPlatformHost } from "../../_domain-names.js";
import { tools, callTool } from "../../_mcp-tools.js";

const versions = ["2025-11-25", "2025-06-18", "2025-03-26"];
const failure = (id, code, message, status = 200) => json({ jsonrpc: "2.0", id, error: { code, message } }, status);
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function checkOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!isPlatformHost(url.hostname) || (origin !== null && origin !== url.origin)) return json({ error: "Origin not allowed" }, 403);
}

export function onRequestGet({ request }) {
  return checkOrigin(request) ?? new Response(null, { status: 405, headers: { Allow: "POST" } });
}
export const onRequestDelete = onRequestGet;

export async function onRequestPost(context) {
  const { request } = context;
  const denied = checkOrigin(request);
  if (denied) return denied;
  const identity = await requireApiKey(context);
  if (identity.response) return identity.response;
  const version = request.headers.get("MCP-Protocol-Version");
  if (version !== null && !versions.includes(version)) return failure(null, -32600, "Unsupported MCP protocol version", 400);
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") return failure(null, -32600, "Expected application/json", 415);
  if (Number(request.headers.get("Content-Length")) > 16384) return failure(null, -32600, "Request too large", 413);
  const body = await request.text();
  if (body.length > 16384) return failure(null, -32600, "Request too large", 413);
  let rpc;
  try { rpc = JSON.parse(body); } catch { return failure(null, -32700, "Parse error", 400); }
  if (!isObject(rpc) || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") return failure(null, -32600, "Invalid JSON-RPC request", 400);
  const { id, method, params = {} } = rpc;
  if (id === undefined && method.startsWith("notifications/")) return new Response(null, { status: 202 });
  if (typeof id !== "string" && !Number.isSafeInteger(id)) return failure(null, -32600, "Invalid request id", 400);
  if (!isObject(params)) return failure(id, -32602, "Invalid params");
  const success = result => json({ jsonrpc: "2.0", id, result });
  switch (method) {
    case "initialize":
      if (typeof params.protocolVersion !== "string" || !isObject(params.capabilities) || !isObject(params.clientInfo)) return failure(id, -32602, "Invalid initialize params");
      return success({
        protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0],
        capabilities: { tools: {} }, serverInfo: { name: "edgeshort", version: "1.0.0" },
      });
    case "ping": return success({});
    case "tools/list": return success({ tools });
    case "tools/call": {
      const response = await callTool(context, identity, params.name, params.arguments === undefined ? {} : params.arguments);
      if (!response) return failure(id, -32602, "Unknown tool or invalid arguments");
      const data = await response.json();
      const payload = response.ok ? data : { status: response.status, error: data.error };
      return success({ isError: !response.ok, content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload });
    }
    default: return failure(id, -32601, "Method not found");
  }
}
