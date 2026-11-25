import { apiJson, apiOptions, requireApiKey } from "../../../_api.js";
import { linkHandlers } from "../../../_links.js";

const handlers = linkHandlers(requireApiKey, apiJson);
export const onRequestOptions = apiOptions;
export const onRequestGet = handlers.list;
export const onRequestPost = handlers.create;
