import { apiJson, apiOptions, requireApiKey } from "../../../_api.js";
import { linkHandlers } from "../../../_links.js";

const handlers = linkHandlers(requireApiKey, apiJson, { defaultLimit: 100 });
export const onRequestOptions = apiOptions;
export const onRequestGet = handlers.get;
export const onRequestPatch = handlers.update;
export const onRequestDelete = handlers.remove;
