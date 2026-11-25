import { getLinkStore } from "./_storage.js";
import { isCodeShape } from "./_lib.js";
import { lookupLink, recordVisit } from "./_redirect.js";
import { shortLinkErrorPage } from "./_error-page.js";

export async function onRequestGet(context) {
  const code = context.params?.code;
  try {
    // Malformed paths (scanners, favicon.ico, ...) never reach storage.
    if (!isCodeShape(code)) return shortLinkErrorPage("invalid", code);
    const store = getLinkStore();
    const link = await lookupLink(store, code);
    if (!link?.url) return shortLinkErrorPage("missing", code);
    if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) return shortLinkErrorPage("expired", link.code);
    recordVisit(store, link.code, context.waitUntil?.bind(context));
    return new Response(null, { status: 302, headers: { Location: link.url } });
  } catch (error) {
    console.error("redirect failed", error);
    return shortLinkErrorPage("error");
  }
}
