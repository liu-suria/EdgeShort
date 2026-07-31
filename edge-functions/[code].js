import { getKv, getRecord } from "../_lib.js";

export async function onRequestGet(context) {
  try {
    const link = await getRecord(getKv(context), context.params?.code);
    if (!link?.url) return new Response("Short link not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
    const countVisit = async () => {
      // KV has no atomic increment. This is intentionally best-effort, which is
      // appropriate for a personal shortener and avoids delaying the redirect.
      const current = await getRecord(getKv(context), link.code);
      if (!current) return;
      current.visits = (Number(current.visits) || 0) + 1;
      current.updatedAt = current.updatedAt || new Date().toISOString();
      await getKv(context).put(`url_${link.code}`, JSON.stringify(current));
    };
    if (typeof context.waitUntil === "function") context.waitUntil(countVisit().catch(() => {}));
    else countVisit().catch(() => {});
    return Response.redirect(link.url, 302);
  } catch {
    return new Response("Short link unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
