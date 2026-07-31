import { json, requireAuth } from "../../_lib.js";
import { getApiKey, getLinkStore, saveApiKey } from "../../_storage.js";

export async function onRequestDelete(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const store = getLinkStore();
    const key = await getApiKey(store, context.params?.id);
    if (!key) return json({ error: "API key not found" }, 404);
    // Retain a revoked record so an audit trail remains visible in the admin.
    key.revokedAt = new Date().toISOString();
    await saveApiKey(store, key);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return json({ error: error.message || "Unable to revoke API key" }, 500);
  }
}
