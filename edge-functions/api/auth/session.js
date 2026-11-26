import { listLinks } from "../../_link-page.js";
import { requireAuth } from "../../_accounts.js";
import { getInstallation, prepareSetup } from "../../_installation.js";
import { getLinkStore } from "../../_storage.js";
import { json } from "../../_lib.js";

export async function onRequestGet(context) {
  try {
    const store = getLinkStore();
    const config = await getInstallation(store);
    if (!config) {
      await prepareSetup(store);
      return json({ authenticated: false, needsSetup: true, needsProof: !context.trustedLocalSetup });
    }
    const auth = await requireAuth(context, config);
    if (auth.response?.status === 401) return json({ authenticated: false });
    if (auth.response) return auth.response;
    const user = auth.user;
    const url = new URL(context.request.url);
    let page;
    if (url.searchParams.get("dashboard") === "1") {
      try {
        page = await listLinks(store, new URLSearchParams("limit=20"), url.origin, 20, true,
          user.role === "admin" ? undefined : user.groups);
      } catch { /* The dashboard retries the page without discarding a valid login. */ }
    }
    return json({ authenticated: true, user, page });
  } catch { return json({ error: "无法读取配置" }, 503); }
}
