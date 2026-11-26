import { initialize } from "../../_installation.js";
import { createSession, errorResponse, json, readJson, sessionCookie } from "../../_lib.js";
import { getLinkStore } from "../../_storage.js";

export async function onRequestPost(context) {
  try {
    const config = await initialize(getLinkStore(), context, await readJson(context.request));
    const cookie = sessionCookie(await createSession(config.sessionSecret, "admin"));
    return json({ ok: true }, 201, { "Set-Cookie": cookie });
  } catch (error) { return errorResponse(error, json, "无法完成首次配置"); }
}
