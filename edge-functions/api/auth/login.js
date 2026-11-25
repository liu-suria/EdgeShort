import {
  clientIp, createSession, errorResponse, getSecrets, json, passwordMatches, readJson, sessionCookie,
} from "../../_lib.js";
import { getLinkStore } from "../../_storage.js";
import { clearLoginFailures, loginGate, recordLoginFailure } from "../../_ratelimit.js";

export async function onRequestPost(context) {
  try {
    const { password } = await readJson(context.request);
    let secrets;
    try {
      secrets = getSecrets(context);
    } catch {
      return json({ error: "Server authentication is not configured" }, 503);
    }
    const store = getLinkStore();
    const gate = await loginGate(store, clientIp(context.request));
    if (!gate.allowed) {
      return json({ error: "Too many failed attempts. Please try again later." }, 429, { "Retry-After": String(gate.retryAfter) });
    }
    if (typeof password !== "string" || !(await passwordMatches(password, secrets.adminPassword))) {
      await recordLoginFailure(store, gate);
      return json({ error: "Incorrect password" }, 401);
    }
    await clearLoginFailures(store, gate);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(await createSession(secrets.sessionSecret)) });
  } catch (error) {
    return errorResponse(error, json, "Unable to sign in");
  }
}
