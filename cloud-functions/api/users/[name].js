import { updateAccount } from "../../../edge-functions/_accounts.js";
import { json, readJson } from "../../../edge-functions/_lib.js";
import { adminOnly } from "./index.js";

export const onRequestPatch = adminOnly(async (store, context) =>
  json({ user: await updateAccount(store, context.params.name, await readJson(context.request)) }));
