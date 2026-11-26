import { isBrandRoute, isPlatformRoute } from "./_destinations.js";
import { recordVisit } from "./_visit-shards.js";
import { getLinkStore } from "./_storage.js";
import { isGroupName, routeLinkPath } from "./_lib.js";
import { lookupLink, lookupRoot } from "./_redirect.js";
import { shortLinkErrorPage } from "./_error-page.js";

export async function onRequestGet(context) {
  return redirectPath(context, routeLinkPath(context.params));
}

export async function redirectPath(context, code, brandHost) {
  try {
    // Malformed paths (scanners, favicon.ico, ...) never reach storage.
    if (!code) return shortLinkErrorPage("invalid", code);
    const store = getLinkStore();
    const waitUntil = context.waitUntil?.bind(context);
    const origin = new URL(context.request.url).origin;
    const root = isGroupName(code) ? await lookupRoot(store, code, origin, waitUntil) : null;
    if (root?.expiresAt && Date.parse(root.expiresAt) <= Date.now()) return shortLinkErrorPage("expired", code);
    const { link, source } = root?.group ? { link: root.link, source: "group" }
      : await lookupLink(store, code, origin, waitUntil, root?.record);
    if (!link?.url) return shortLinkErrorPage("missing", code);
    if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) return shortLinkErrorPage("expired", link.code);
    // Guard pre-upgrade mappings and in-flight edits against redirect loops as well.
    const target = new URL(link.url);
    if (isPlatformRoute(target) || (brandHost && isBrandRoute(target, brandHost))) return shortLinkErrorPage("invalid", code);
    let visitStatus = "skipped";
    if (context.request.method === "GET") {
      try { await recordVisit(store, link); visitStatus = "stored"; }
      catch { visitStatus = "degraded"; console.warn("visit persistence unavailable"); }
    }
    return new Response(null, {
      status: 302,
      headers: { Location: link.url, "Cache-Control": "no-store", "X-EdgeShort-Cache": source, "X-EdgeShort-Visit": visitStatus },
    });
  } catch (error) {
    console.error("redirect failed", error);
    return shortLinkErrorPage("error");
  }
}

export const onRequestHead = onRequestGet;
