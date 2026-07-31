import { createSession, getSecrets, json, passwordMatches, readJson, sessionCookie } from "../../_lib.js";

export async function onRequestPost(context) {
  try {
    const { password } = await readJson(context.request);
    const { adminPassword, sessionSecret } = getSecrets(context);
    if (typeof password !== "string" || !(await passwordMatches(password, adminPassword))) {
      return json({ error: "Incorrect password" }, 401);
    }
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(await createSession(sessionSecret)) });
  } catch (error) {
    const configured = error.message?.includes("must be configured") ? 503 : 400;
    return json({ error: configured === 503 ? "Server authentication is not configured" : error.message || "Unable to sign in" }, configured);
  }
}
