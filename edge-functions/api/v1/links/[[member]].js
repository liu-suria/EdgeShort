import { apiJson, apiOptions, requireApiKey } from "../../../_api.js";
import { linkHandlers } from "../../../_links.js";

import { memberRoute } from "../../../_member-route.js";

const handlers = linkHandlers(requireApiKey, apiJson, { defaultLimit: 100 });
export const onRequestOptions = apiOptions;
export const onRequestGet = memberRoute(handlers.get, "/api/v1/links/", apiJson);
export const onRequestPatch = memberRoute(handlers.update, "/api/v1/links/", apiJson);
export const onRequestDelete = memberRoute(handlers.remove, "/api/v1/links/", apiJson);
