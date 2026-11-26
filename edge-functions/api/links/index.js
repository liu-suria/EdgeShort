import { requireAuth } from "../../_accounts.js";
import { json } from "../../_lib.js";
import { linkHandlers } from "../../_links.js";

const handlers = linkHandlers(requireAuth, json, { includeGroups: true });
export const onRequestGet = handlers.list;
export const onRequestPost = handlers.create;
