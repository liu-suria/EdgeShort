import { getInstallation } from "./_installation.js";
import { derive } from "./_password.js";
import { HttpError, isAccountName, isGroupName, json, sessionIdentity, timingSafeEqual, toBase64Url } from "./_lib.js";
import { getLinkStore, getRecord } from "./_storage.js";

const admin = Object.freeze({ username: "admin", role: "admin" });
const validName = value => isAccountName(value) && value !== "admin";
const userKey = name => "users/" + name + ".json";
const strong = { type: "json", consistency: "strong" };


export async function readAccount(store, username) {
  return validName(username) ? store.get(userKey(username), strong) : null;
}

function publicAccount(row) {
  return { username: row.username, role: "member", groups: row.groups, enabled: row.enabled, revision: row.revision };
}

export async function liveIdentity(store, username, version) {
  if (username === admin.username) return admin;
  const row = await readAccount(store, username);
  if (!row?.enabled || (version !== undefined && row.version !== version)) return null;
  return publicAccount(row);
}

export async function requireAuth(context, installation) {
  try {
    const config = installation ?? await getInstallation(getLinkStore());
    if (!config) return { response: json({ error: "请先创建管理员" }, 401), needsSetup: true };
    const identity = await sessionIdentity(context.request, config.sessionSecret);
    const user = identity && await liveIdentity(getLinkStore(), identity.username, identity.version);
    if (user?.role === "admin") return { user: { ...user, username: config.username, owner: "admin" } };
    return user ? { user } : { response: json({ error: "请重新登录" }, 401) };
  } catch {
    return { response: json({ error: "Authentication temporarily unavailable" }, 503) };
  }
}

export function requireGroupAccess(user, group) {
  if (user.role !== "admin" && !user.groups.includes(group)) throw new HttpError(403, "无权管理该分组或根路径");
}

export function requireAdmin(user) {
  if (user.role !== "admin") throw new HttpError(403, "需要站点管理员权限");
}

export async function verifyMember(store, name, password) {
  if (typeof password !== "string" || !password) return null;
  const row = await readAccount(store, name);
  const derived = await derive(password, row?.salt || "edgeshort-unavailable-account");
  return row?.enabled && timingSafeEqual(derived, row.digest) ? row : null;
}

async function validatedGroups(store, groups) {
  if (!Array.isArray(groups) || !groups.every(isGroupName)) throw new HttpError(422, "分组列表无效");
  const unique = [...new Set(groups)].sort();
  const records = await Promise.all(unique.map(name => getRecord(store, name)));
  if (records.some(row => row?.kind !== "group")) throw new HttpError(422, "只能授权已有分组");
  return unique;
}

export async function createAccount(store, { username, password, groups = [] }) {
  if (!validName(username)) throw new HttpError(422, "账号须以小写字母开头，可含小写字母、数字、下划线或连字符；admin 为保留账号");
  if (typeof password !== "string" || !password) throw new HttpError(422, "密码不能为空");
  if ((await getInstallation(store))?.username === username) throw new HttpError(409, "账号已存在");
  const salt = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const row = { username, groups: await validatedGroups(store, groups), enabled: true, revision: 1, version: 1,
    salt, digest: await derive(password, salt) };
  try { await store.setJSON(userKey(username), row, { onlyIfNew: true }); }
  catch (error) {
    if (error?.code === "PRECONDITION_FAILED") throw new HttpError(409, "账号已存在");
    throw error;
  }
  return publicAccount(row);
}

export async function listAccounts(store) {
  const { blobs } = await store.list({ prefix: "users/", consistency: "strong" });
  const rows = await Promise.all(blobs.map(({ key }) => store.get(key, strong)));
  return rows.filter(Boolean).map(publicAccount).sort((a, b) => a.username.localeCompare(b.username));
}

export async function updateAccount(store, name, body) {
  if (!validName(name)) throw new HttpError(404, "账号不存在");
  const key = "account-locks/" + name + ".json";
  try { await store.setJSON(key, { since: Date.now() }, { onlyIfNew: true }); }
  catch (error) {
    if (error?.code === "PRECONDITION_FAILED") throw new HttpError(409, "账号正在更新，请重试");
    throw error;
  }
  try {
    const row = await readAccount(store, name);
    if (!row) throw new HttpError(404, "账号不存在");
    if (body.revision !== undefined && body.revision !== row.revision) throw new HttpError(409, "授权已变更，请重新打开账号");
    if (body.groups === undefined && body.enabled === undefined) throw new HttpError(422, "请指定分组或账号状态");
    if (body.groups !== undefined) row.groups = await validatedGroups(store, body.groups);
    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") throw new HttpError(422, "账号状态无效");
      if (row.enabled !== body.enabled) row.version++;
      row.enabled = body.enabled;
    }
    row.revision++;
    await store.setJSON(userKey(name), row);
    return publicAccount(row);
  } finally {
    await store.delete(key);
  }
}
