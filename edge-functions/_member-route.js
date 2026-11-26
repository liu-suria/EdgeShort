import { isCodeShape, isGroupName } from "./_lib.js";

// Makers' documented [[member]] route covers the multi-segment suffix.
export function memberRoute(handler, prefix, respond) {
  return context => {
    const path = new URL(context.request.url).pathname;
    const parts = path.slice(prefix.length).replace(/\/$/, "").split("/");
    try {
      const decoded = parts.map(decodeURIComponent);
      const code = decoded[decoded.length - 1];
      const group = decoded.length === 2 ? decoded[0] : undefined;
      if (path.startsWith(prefix) && decoded.length <= 2 && isCodeShape(code) && (group === undefined || isGroupName(group))) {
        return handler({ ...context, params: { group, code } });
      }
    } catch { /* malformed percent encoding */ }
    return respond({ error: "Link not found" }, 404);
  };
}
