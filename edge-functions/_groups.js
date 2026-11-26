import { domainRegistry, publishedGroup } from "./_domains.js";
import { requireAdmin, requireGroupAccess } from "./_accounts.js";
import { errorResponse, HttpError, isCodeShape, isGroupName, linkPath, makeRecordId, normaliseExpiry, publicGroup, readJson } from "./_lib.js";
import { getLinkStore, getRecord, getVisits, listGroups, recordKey, saveNewRecord, setVisits } from "./_storage.js";
import { invalidate } from "./_redirect.js";
import { withRouteLocks } from "./_route-lock.js";

async function requireGroup(store, name) {
  const record = await getRecord(store, name);
  if (record?.kind !== "group") throw new HttpError(404, "Group not found");
  return record;
}

export async function createGroup(store, body, origin) {
  const { name, upgradeRoot = false } = body;
  if (!isGroupName(name) || typeof upgradeRoot !== "boolean") throw new HttpError(422, "Invalid group name or upgradeRoot flag");
  const current = await getRecord(store, name);
  if (current?.kind === "group") {
    if (upgradeRoot && current.upgradedFrom) return publicGroup(current, origin);
    throw new HttpError(409, "Group already exists");
  }
  if (current && !upgradeRoot) throw new HttpError(409, "Root short link already uses this path");
  if (!current && upgradeRoot) throw new HttpError(404, "Root short link not found");
  const group = { kind: "group", code: name, id: makeRecordId(), defaultCode: null, expiresAt: groupExpiry(body.expiresAt) };
  // Index first. Readers verify the authoritative root so an interrupted create
  // cannot publish a phantom group or leave a committed group undiscoverable.
  await store.setJSON("group-names/" + name + ".json", { name });
  if (current) {
    const member = { ...current, id: current.id || "legacy-root:" + name, code: linkPath(name, "home") };
    if (!await saveNewRecord(store, member)) throw new HttpError(409, "The home member already exists");
    await setVisits(store, member.code, await getVisits(store, name));
    Object.assign(group, { defaultCode: "home", defaultId: member.id, upgradedFrom: member.id });
    // Commit the switch last. Until then the original link still resolves.
    await store.setJSON(recordKey(name), group);
  } else if (!await saveNewRecord(store, group)) {
    throw new HttpError(409, "Path already in use");
  }
  await invalidate(name, origin);
  return publicGroup(group, origin);
}

async function updateGroup(store, name, body, origin) {
  const group = await requireGroup(store, name);
  if (!("defaultCode" in body || "expiresAt" in body)) throw new HttpError(422, "Supply defaultCode or expiresAt");
  if ("expiresAt" in body) group.expiresAt = groupExpiry(body.expiresAt);
  if ("defaultCode" in body) {
    const { defaultCode } = body;
    if (defaultCode !== null && !isCodeShape(defaultCode)) throw new HttpError(422, "Supply a member code or null");
    const member = defaultCode && await getRecord(store, linkPath(name, defaultCode));
    if (defaultCode && !member?.url) throw new HttpError(422, "Default must be a member of this group");
    if (member?.expiresAt && Date.parse(member.expiresAt) <= Date.now()) throw new HttpError(422, "Default member has expired");
    group.defaultCode = defaultCode;
    group.defaultId = member?.id ?? null;
  }
  await store.setJSON(recordKey(name), group);
  await invalidate(name, origin);
  return publicGroup(group, origin);
}

function groupExpiry(input) {
  const expiry = normaliseExpiry(input);
  if (expiry === undefined) throw new HttpError(422, "Supply a future timestamp, 1–36500 days, or null");
  return expiry;
}

export function groupHandlers(authorise, respond) {
  const handle = (run) => async (context) => {
    const auth = await authorise(context);
    if (auth.response) return auth.response;
    try {
      const name = context.params?.name;
      if (name !== undefined && !isGroupName(name)) throw new HttpError(422, "Invalid group name");
      if (name !== undefined) requireGroupAccess(auth.user, name);
      if (context.request.method === "POST") requireAdmin(auth.user);
      const body = ["POST", "PATCH"].includes(context.request.method) ? await readJson(context.request) : {};
      return await run(getLinkStore(), new URL(context.request.url).origin, name, body, auth.user);
    } catch (error) {
      return errorResponse(error, respond, "Unable to manage group");
    }
  };
  return {
    list: handle(async (store, origin, _name, _body, user) => {
      const [groups, domains] = await Promise.all([listGroups(store, user.role === "admin" ? undefined : user.groups), domainRegistry(store)]);
      return respond({ groups: groups.map(row => publishedGroup(publicGroup(row, origin), domains, origin, user.role === "admin")) });
    }),
    get: handle(async (store, origin, name, _body, user) => {
      const group = publicGroup(await requireGroup(store, name), origin);
      return respond({ group: publishedGroup(group, await domainRegistry(store), origin, user.role === "admin") });
    }),
    create: handle(async (store, origin, _, body) => withRouteLocks(store, [body.name], async () =>
      respond({ group: await createGroup(store, body, origin) }, 201))),
    update: handle(async (store, origin, name, body, user) => withRouteLocks(store, [name], async () =>
      respond({ group: publishedGroup(await updateGroup(store, name, body, origin), await domainRegistry(store), origin, user.role === "admin") }))),
  };
}
