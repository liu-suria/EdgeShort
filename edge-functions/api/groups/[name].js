import { requireAuth } from "../../_accounts.js";
import { json } from "../../_lib.js";
import { groupHandlers } from "../../_groups.js";

const handlers = groupHandlers(requireAuth, json);
export const onRequestGet = handlers.get;
export const onRequestPatch = handlers.update;
