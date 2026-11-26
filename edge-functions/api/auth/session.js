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
    return auth.response ?? json({ authenticated: true, user: auth.user });
  } catch { return json({ error: "无法读取配置" }, 503); }
}
