import { getInstallation } from "../../../edge-functions/_installation.js";
import { derive } from "../../../edge-functions/_password.js";
import { verifyMember } from "../../../edge-functions/_accounts.js";
import {
  clientIp, createSession, errorResponse, json, timingSafeEqual, readJson, sessionCookie,
} from "../../../edge-functions/_lib.js";
import { getLinkStore } from "../../../edge-functions/_storage.js";
import { clearLoginFailures, loginGate, recordLoginFailure } from "../../../edge-functions/_ratelimit.js";

export async function onRequestPost(context) {
  try {
    const { username = "admin", password } = await readJson(context.request);
    const store = getLinkStore();
    const [config, gate] = await Promise.all([getInstallation(store), loginGate(store, clientIp(context.request))]);
    if (!config) return json({ error: "请先完成首次配置", needsSetup: true }, 409);
    if (!gate.allowed) {
      return json({ error: "Too many failed attempts. Please try again later." }, 429, { "Retry-After": String(gate.retryAfter) });
    }
    const isAdmin = username === config.username;
    const member = !isAdmin && await verifyMember(store, username, password);
    const authenticated = isAdmin
      ? typeof password === "string" && password !== "" && timingSafeEqual(await derive(password, config.salt), config.digest)
      : Boolean(member);
    if (!authenticated) {
      await recordLoginFailure(store, gate);
      return json({ error: "Incorrect password" }, 401);
    }
    await clearLoginFailures(store, gate);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(await createSession(config.sessionSecret, isAdmin ? "admin" : username, member?.version || 1)) });
  } catch (error) {
    return errorResponse(error, json, "Unable to sign in");
  }
}
