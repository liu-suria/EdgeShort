import { groupHandlers } from "./_groups.js";
import { linkHandlers } from "./_links.js";
import { json } from "./_lib.js";

const group = { type: "string", description: "Group name. Only an administrator can use the root namespace (empty string)." };
const code = { type: "string", description: "A single short code, without a slash.", minLength: 1 };
const url = { type: "string", description: "HTTP or HTTPS destination URL." };
const title = { type: "string", description: "Link remark." };
const expiresAt = { type: ["string", "integer", "null"], description: "Future ISO timestamp, days from now (1–36500), or null for a permanent link." };
const schema = (properties, required = []) => ({ type: "object", properties, required, additionalProperties: false });

export const tools = [
  { name: "list_groups", description: "List accessible groups, branded entry URLs and current defaults.", inputSchema: schema({}) },
  { name: "list_links", description: "Search accessible links, destinations, expiration and visit counts.", inputSchema: schema({
    group, cursor: { type: "string", description: "nextCursor returned by the previous page of this query" }, q: { type: "string" }, status: { type: "string", enum: ["active", "expired"] },
    limit: { type: "integer", minimum: 1, maximum: 500 }, offset: { type: "integer", minimum: 0, maximum: 1000000 },
  }) },
  { name: "create_link", description: "Create a short link and return its published shortUrl. Omit code to generate one.", inputSchema: schema({ group, url, code, title, expiresAt }, ["group", "url"]) },
  { name: "update_link", description: "Change the destination, remark or expiry of an existing link. Omitted fields are preserved.", inputSchema: schema({ group, code, url, title, expiresAt }, ["group", "code"]) },
  { name: "set_group_default", description: "Set the group's default to an active member, or pass null to clear it.", inputSchema: schema({ group, defaultCode: { type: ["string", "null"] } }, ["group", "defaultCode"]) },
];

const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

// Validate the advertised input schema before passing data to the shared business handlers.
function validArguments({ properties, required }, args) {
  if (!isObject(args) || required.some(key => !Object.prototype.hasOwnProperty.call(args, key))) return false;
  return Object.entries(args).every(([key, value]) => {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) return false;
    const rule = properties[key];
    const type = value === null ? "null" : Number.isInteger(value) ? "integer" : typeof value;
    return (Array.isArray(rule.type) ? rule.type.includes(type) : rule.type === type) && (!rule.enum || rule.enum.includes(value))
      && (rule.minLength === undefined || value.length >= rule.minLength)
      && (rule.minimum === undefined || value >= rule.minimum) && (rule.maximum === undefined || value <= rule.maximum);
  });
}

export async function callTool(context, identity, name, args) {
  const tool = tools.find(item => item.name === name);
  if (!tool || !validArguments(tool.inputSchema, args)) return null;

  // The identity is valid only for this POST. REST handlers enforce the same group
  // checks, write locks, cache invalidation, and published-URL logic as the UI.
  const authorised = async () => identity;
  const links = linkHandlers(authorised, json, { defaultLimit: 100 });
  const groups = groupHandlers(authorised, json);
  const endpoint = new URL(context.request.url);
  function invoke(handler, method, params = {}, body, query = "") {
    const request = new Request(endpoint.origin + "/api/mcp" + query, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    return handler({ ...context, request, params });
  }
  switch (name) {
    case "list_groups":
      return invoke(groups.list, "GET");
    case "list_links": {
      const query = Object.entries(args).map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(String(value))).join("&");
      return invoke(links.list, "GET", {}, undefined, query ? "?" + query : "");
    }
    case "create_link":
      return invoke(links.create, "POST", {}, args);
    case "update_link": {
      const { group, code, ...patch } = args;
      if (!Object.keys(patch).length) return json({ error: "Supply url, title or expiresAt" }, 422);
      return invoke(links.update, "PATCH", group ? { group, code } : { code }, patch);
    }
    case "set_group_default":
      return invoke(groups.update, "PATCH", { name: args.group }, { defaultCode: args.defaultCode });
  }
}
