import { isPlatformHost } from "./edge-functions/_domain-names.js";
import { isCodeShape, isGroupName } from "./edge-functions/_lib.js";

// Intercept branded hosts before static files and management routes.
export function middleware({ request, next, rewrite }) {
  const url = new URL(request.url);
  if (isPlatformHost(url.hostname)) {
    if (request.method === "GET" || request.method === "HEAD") {
      const member = /^\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
      if (member && isGroupName(member[1]) && isCodeShape(member[2])) {
        return rewrite("/internal/links/redirect?group=" + member[1] + "&code=" + member[2]);
      }
    }
    return next();
  }
  const code = url.pathname.replace(/^\//, "").replace(/\/$/, "");
  if ((url.pathname !== "/" && !isCodeShape(code)) || !["GET", "HEAD"].includes(request.method)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return rewrite("/internal/domains/resolve?member=" + encodeURIComponent(code));
}
