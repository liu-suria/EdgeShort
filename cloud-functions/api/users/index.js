import { createAccount, listAccounts, requireAdmin, requireAuth } from "../../../edge-functions/_accounts.js";
import { errorResponse, json, readJson } from "../../../edge-functions/_lib.js";
import { getLinkStore } from "../../../edge-functions/_storage.js";

export function adminOnly(run) {
  return async context => {
    const auth = await requireAuth(context);
    if (auth.response) return auth.response;
    try {
      requireAdmin(auth.user);
      return await run(getLinkStore(), context);
    } catch (error) { return errorResponse(error, json, "Unable to manage users"); }
  };
}

export const onRequestGet = adminOnly(async store => json({ users: await listAccounts(store) }));
export const onRequestPost = adminOnly(async (store, context) =>
  json({ user: await createAccount(store, await readJson(context.request)) }, 201));
