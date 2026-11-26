import { HttpError, isAccountName, timingSafeEqual, toBase64Url } from "./_lib.js";
import { derive } from "./_password.js";

const configKey = "system/installation.json";
const bootstrapKey = "system/bootstrap.json";
const strong = { type: "json", consistency: "strong" };
const randomSecret = bytes => toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));

async function insert(store, key, value) {
  try { await store.setJSON(key, value, { onlyIfNew: true }); return true; }
  catch (error) { if (error?.code === "PRECONDITION_FAILED") return false; throw error; }
}

async function installation(username, password) {
  const salt = randomSecret(16);
  return { username, salt, digest: await derive(password, salt), sessionSecret: randomSecret(32) };
}

export function getInstallation(store) {
  return store.get(configKey, strong);
}

// The proof can be read from the private Blob key name in the Makers console.
// Public HTTP responses only report whether setup is needed.
export async function prepareSetup(store) {
  let bootstrap = await store.get(bootstrapKey, strong);
  if (!bootstrap) {
    const candidate = { code: randomSecret(24) };
    if (await insert(store, bootstrapKey, candidate)) bootstrap = candidate;
    else bootstrap = await store.get(bootstrapKey, strong);
  }
  if (!bootstrap) throw new HttpError(409, "初始化状态已变更，请刷新");
  await insert(store, "setup/" + bootstrap.code + ".json", { purpose: "initial administrator" });
  return bootstrap.code;
}

export async function initialize(store, context, { username, password, setupCode }) {
  if (await getInstallation(store)) throw new HttpError(409, "管理员已创建，请登录");
  if (!isAccountName(username)) throw new HttpError(422, "账号须以小写字母开头，可含小写字母、数字、下划线或连字符");
  if (typeof password !== "string" || !password) throw new HttpError(422, "密码不能为空");
  const code = await prepareSetup(store);
  // trustedLocalSetup is injected only by the loopback review server.
  if (!context.trustedLocalSetup && !timingSafeEqual(setupCode, code)) throw new HttpError(403, "首次设置码无效");
  if (await store.get("users/" + username + ".json", strong)) throw new HttpError(409, "账号已存在");
  const config = await installation(username, password);
  if (!await insert(store, configKey, config)) throw new HttpError(409, "管理员已创建，请登录");
  await Promise.allSettled([store.delete(bootstrapKey), store.delete("setup/" + code + ".json")]);
  return config;
}
