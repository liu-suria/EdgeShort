import { isCodeShape } from "../../_lib.js";
import { getLinkStore } from "../../_storage.js";
import { domainRegistry } from "../../_domains.js";
import { isPlatformHost } from "../../_domain-names.js";
import { shortLinkErrorPage } from "../../_error-page.js";
import { redirectPath } from "../../[code].js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (isPlatformHost(url.hostname)) return shortLinkErrorPage("missing");
  const code = url.searchParams.get("member");
  if (code === null || (code && !isCodeShape(code))) return shortLinkErrorPage("invalid");
  try {
    const rows = await domainRegistry(getLinkStore());
    const binding = rows.find(row => row.hostname === url.hostname && row.status === "active");
    if (!binding) return shortLinkErrorPage("missing");
    return redirectPath(context, code ? binding.group + "/" + code : binding.group, binding.hostname);
  } catch { return shortLinkErrorPage("error"); }
}
export const onRequestHead = onRequestGet;
