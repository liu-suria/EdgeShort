import { updateAccount } from "../../_accounts.js";
import { json, readJson } from "../../_lib.js";
import { adminOnly } from "./index.js";

export const onRequestPatch = adminOnly(async (store, context) =>
  json({ user: await updateAccount(store, context.params.name, await readJson(context.request)) }));
