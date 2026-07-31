import { getLinkStore, getRecord, saveRecord } from "./_storage.js";

export async function onRequestGet(context) {
  try {
    const store = getLinkStore();
    const link = await getRecord(store, context.params?.code, "eventual");
    if (!link?.url) return new Response("Short link not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
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
    return new Response("Short link unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
