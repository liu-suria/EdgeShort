import { json, requireAuth } from "../../_lib.js";
import { linkHandlers } from "../../_links.js";

const handlers = linkHandlers(requireAuth, json);
export const onRequestGet = handlers.list;
export const onRequestPost = handlers.create;
