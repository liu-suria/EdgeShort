import { errorResponse, json, requireAuth } from "../../_lib.js";
import { getApiKey, getLinkStore, saveApiKey } from "../../_storage.js";

export async function onRequestDelete(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    const store = getLinkStore();
    const key = await getApiKey(store, context.params?.id);
    if (!key) return json({ error: "API key not found" }, 404);
    // Retain a revoked record so an audit trail remains visible in the admin.
    await saveApiKey(store, { ...key, revokedAt: new Date().toISOString() });
    return json(null, 204);
  } catch (error) {
    return errorResponse(error, json, "Unable to revoke API key");
  }
}
