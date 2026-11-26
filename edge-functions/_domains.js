import { isBrandRoute } from "./_destinations.js";
import { getLinkStore, getRecord, hasLinkMatching } from "./_storage.js";
import { requireAdmin, requireAuth } from "./_accounts.js";
import { errorResponse, HttpError, isGroupName, json, makeRecordId, readJson } from "./_lib.js";
import { normalizeDomain, primaryOrigin } from "./_domain-names.js";

const indexKey = "domains/registry.json";
const lockKey = "domains/write-lock.json";
export async function domainRegistry(store) {
  return await store.get(indexKey, { type: "json", consistency: "strong" }) ?? [];
}

export function groupDomain(rows, name) {
  return {
    active: rows.find(row => row.group === name && row.status === "active") ?? null,
    pending: rows.find(row => row.group === name && row.status === "pending") ?? null,
  };
}

function withBrand(resource, hostname, origin, suffix) {
  const branded = primaryOrigin(hostname, origin);
  if (!branded) return resource;
  const brandUrl = branded + "/" + suffix;
  return { ...resource, brandUrl, shortUrl: brandUrl };
}

export function publishedGroup(group, rows, origin, admin = false) {
  const domain = groupDomain(rows, group.name);
  const published = withBrand(group, domain.active?.hostname, origin, "");
  return admin ? { ...published, domain } : published;
}

export function publishedLink(link, rows, origin) {
  return withBrand(link, groupDomain(rows, link.group).active?.hostname, origin, link.code);
}

async function validateActivation(store, hostname) {
  if (await hasLinkMatching(store, link => isBrandRoute(new URL(link.url), hostname))) {
    throw new HttpError(422, "已有短链以该域名的短链路径或组入口为目标，请先修改目标地址");
  }
}

export async function changeDomain(store, group, body, user, origin) {
  requireAdmin(user);
  if (!isGroupName(group)) throw new HttpError(422, "分组无效");
  const { action } = body;
  if ((await getRecord(store, group))?.kind !== "group") throw new HttpError(404, "分组不存在");
  try { await store.setJSON(lockKey, { since: Date.now() }, { onlyIfNew: true }); }
  catch (error) {
    if (error?.code === "PRECONDITION_FAILED") throw new HttpError(409, "域名正在更新，请重试");
    throw error;
  }
  try {
    let rows = await domainRegistry(store);
    const { active, pending } = groupDomain(rows, group);
    if (action === "configure") {
      const hostname = normalizeDomain(body.hostname, new URL(origin).hostname === "127.0.0.1");
      if (!hostname) throw new HttpError(422, "请输入完整域名，不含协议、端口或路径");
      if (pending) throw new HttpError(409, "请先处理历史待审申请");
      if (active?.hostname === hostname) return groupDomain(rows, group);
      if ((active?.id ?? null) !== (body.id ?? null)) throw new HttpError(409, "主域名已变更，请刷新后重试");
      if (rows.some(row => row.hostname === hostname)) throw new HttpError(409, "域名已被使用");
      await validateActivation(store, hostname);
      rows = rows.filter(row => row !== active);
      rows.push({ id: makeRecordId(), group, hostname, status: "active", configuredBy: user.username });
    } else {
      const subject = action === "unbind" ? active : pending;
      if (!["approve", "reject", "unbind"].includes(action)) throw new HttpError(422, "域名操作无效");
      if (!subject || subject.id !== body.id) throw new HttpError(409, "申请已变更，请刷新后重试");
      if (action === "approve") {
        await validateActivation(store, subject.hostname);
        rows = rows.filter(row => row !== active);
        subject.status = "active";
      } else rows = rows.filter(row => row !== subject);
    }
    await store.setJSON(indexKey, rows);
    return groupDomain(rows, group);
  } finally { await store.delete(lockKey); }
}

export async function domainHandler(context) {
  const auth = await requireAuth(context);
  if (auth.response) return auth.response;
  try {
    requireAdmin(auth.user);
    const result = await changeDomain(getLinkStore(), context.params.name, await readJson(context.request), auth.user, new URL(context.request.url).origin);
    return json({ domain: result });
  } catch (error) { return errorResponse(error, json, "无法更新域名"); }
}
