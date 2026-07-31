import { getLinkStore, getRecord, saveRecord } from "./_storage.js";
import { shortLinkErrorPage } from "./_error-page.js";

export async function onRequestGet(context) {
  try {
    const store = getLinkStore();
    const link = await getRecord(store, context.params?.code, "eventual");
    if (!link?.url) return shortLinkErrorPage({
      status: 404, code: context.params?.code, title: "这个链接不存在", message: "它可能已被删除、修改，或从未创建过。",
    });
    if (link.expiresAt && Date.parse(link.expiresAt) <= Date.now()) return shortLinkErrorPage({
      status: 410, code: link.code, title: "这个链接已过期", message: "该链接的有效期已经结束，请向分享者索取新的链接。",
    });
    const countVisit = async () => {
      // Blob writes do not have an atomic increment. Use a strongly consistent
      // read, then update in the background so redirects remain fast.
      const current = await getRecord(store, link.code);
      if (!current) return;
      current.visits = (Number(current.visits) || 0) + 1;
      current.updatedAt = current.updatedAt || new Date().toISOString();
      await saveRecord(store, current);
    };
    if (typeof context.waitUntil === "function") context.waitUntil(countVisit().catch(() => {}));
    else countVisit().catch(() => {});
    return Response.redirect(link.url, 302);
  } catch {
    return shortLinkErrorPage({
      status: 503, title: "链接暂时不可用", message: "服务正在恢复中，请稍后再试。",
    });
  }
}
