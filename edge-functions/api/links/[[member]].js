import { requireAuth } from "../../_accounts.js";
import { json } from "../../_lib.js";
import { linkHandlers } from "../../_links.js";

import { memberRoute } from "../../_member-route.js";

const handlers = linkHandlers(requireAuth, json);
export const onRequestGet = memberRoute(handlers.get, "/api/links/", json);
export const onRequestPatch = memberRoute(handlers.update, "/api/links/", json);
export const onRequestDelete = memberRoute(handlers.remove, "/api/links/", json);
