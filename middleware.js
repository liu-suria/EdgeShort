import { isPlatformHost } from "./edge-functions/_domain-names.js";
import { isCodeShape } from "./edge-functions/_lib.js";

// Intercept branded hosts before static files and management routes.
export function middleware({ request, next, rewrite }) {
  const url = new URL(request.url);
  if (isPlatformHost(url.hostname)) return next();
  const code = url.pathname.replace(/^\//, "").replace(/\/$/, "");
  if ((url.pathname !== "/" && !isCodeShape(code)) || !["GET", "HEAD"].includes(request.method)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return rewrite("/internal/domains/resolve?member=" + encodeURIComponent(code));
}
