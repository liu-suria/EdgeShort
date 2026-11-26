import { apiJson, requireApiKey } from "../../../_api.js";
import { groupHandlers } from "../../../_groups.js";

const handlers = groupHandlers(requireApiKey, apiJson);
export { apiOptions as onRequestOptions } from "../../../_api.js";
export const onRequestGet = handlers.get;
export const onRequestPatch = handlers.update;
