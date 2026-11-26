import { redirectPath } from "../../[code].js";
import { isCodeShape, isGroupName } from "../../_lib.js";
import { isPlatformHost } from "../../_domain-names.js";
import { shortLinkErrorPage } from "../../_error-page.js";

export function onRequestGet(context) {
  const url = new URL(context.request.url);
  const group = url.searchParams.get("group"), code = url.searchParams.get("code");
  if (!isPlatformHost(url.hostname) || !isGroupName(group) || !isCodeShape(code)) return shortLinkErrorPage("invalid");
  return redirectPath(context, group + "/" + code);
}
export const onRequestHead = onRequestGet;
