import { isPlatformHost } from "./_domain-names.js";
import { isCodeShape, isLinkPath } from "./_lib.js";

function hostname(url) {
  return url.hostname.toLowerCase().replace(/\.$/, "");
}

function routePath(url) {
  try { return decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, ""); }
  catch { return url.pathname; }
}

export function isBrandRoute(target, domain) {
  const path = routePath(target);
  return hostname(target) === domain && (path === "" || isCodeShape(path));
}

// Internal short links are not destinations. This also covers group defaults
// and indirect cycles between two internal short links.
export function isPlatformRoute(target, managementHost) {
  const known = isPlatformHost(hostname(target)) || target.host.toLowerCase() === managementHost?.toLowerCase();
  return known && isLinkPath(routePath(target));
}
