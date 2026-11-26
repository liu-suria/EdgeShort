# 柿柿短链 (EdgeShort)

A private, no-build URL shortener for EdgeOne Makers. It uses Edge Functions and built-in Blob storage—no framework, storage binding, database, or client-side secrets.

## Included

- `/:code` redirects to the destination with a best-effort visit count.
- `/admin` is a responsive password-protected control panel.
- Create auto-generated or custom 1–16 character codes; edit a code, remark, destination, or expiration; delete, search, and copy short links.
- Generate and revoke API Keys from the admin, with a CORS-enabled API for automation and integrations.
- Branded public error pages for missing, expired, and temporarily unavailable short links.
- Signed, `HttpOnly`, `Secure`, `SameSite=Strict` session cookie with seven-day expiry.
- Input validation for URLs and codes, security response headers, no third-party dependencies, and no build command.

## Deploy to EdgeOne Makers

1. Import this repository as a Makers project. It is a plain static project: leave the build command empty and use the repository root as the output directory.
2. 部署后，从平台主域名打开 `/admin/`。首次配置填写管理员账号与密码。两者均为必填，应用不设字段长度限制；账号须以小写英文字母开头，之后可使用小写字母、数字、下划线或连字符。使用 Makers 时，先打开一次设置页面，再到项目的私有 Blob 命名空间 `edgeshort-links` 查看 `setup/` 目录，将文件名去掉 `.json` 后作为一次性设置码。这一步用来确认配置者持有该项目。
3. 创建成功后自动登录。服务端使用随机盐派生密码摘要，独立生成 32 字节会话签名密钥，与管理员配置一次性写入私有 Blob。首次配置、登录和用户管理使用 Node.js Cloud Functions，支持 PBKDF2-SHA256 的 600,000 次迭代。会话验证与访客跳转继续在边缘函数执行。新部署不需要配置环境变量。重启或重新发布须保留同一 Blob 数据。空 Blob 一律进入首次设置，旧的 ADMIN_PASSWORD、SESSION_SECRET 环境变量不会创建管理员。
4. 平台主域名在 `edge-functions/_domain-names.js` 中显式配置，本项目保留 `vyu.cc` 和 `667989.xyz`。自行部署时将自己的管理域名加入此列表。其他域名仅提供已启用分组的公开跳转。

## API

后台「连接 Agent → 开发者文档」提供按当前站点和授权组生成的调用示例。接入 Agent 可直接使用[接口指南与 Python 样例](admin/agent-guide.md)和[OpenAPI 3.1 描述](admin/openapi.json)。

Open **连接 Agent → 手动 API Key 接入** in `/admin` to generate an API Key. The full key is shown once only; save it somewhere secure. You can revoke it at any time from the same panel.

Use the key in `Authorization: Bearer ...` (or `X-API-Key`). The API returns JSON and permits browser calls with CORS enabled.

```bash
# List links
curl https://your-domain.com/api/v1/links \
  -H "Authorization: Bearer YOUR_API_KEY"

# Create a link; code, title, and expiresAt are optional.
# expiresAt: 3 means the link expires three days after this request.
curl -X POST https://your-domain.com/api/v1/links \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/campaign","code":"summer-26","title":"Summer campaign","expiresAt":3}'

# Read, update, or delete one link
curl https://your-domain.com/api/v1/links/summer-26 \
  -H "Authorization: Bearer YOUR_API_KEY"
curl -X PATCH https://your-domain.com/api/v1/links/summer-26 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/new-destination","title":"Updated campaign"}'
curl -X DELETE https://your-domain.com/api/v1/links/summer-26 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### MCP 客户端接入

macOS + Node.js 20 及以上可以使用仓库内的独立连接器，从项目根目录执行：

```sh
node connector/edgeshort.mjs pair --origin https://vyu.cc --name "我的 Codex"
codex mcp add edgeshort -- node "$PWD/connector/edgeshort.mjs" serve --origin https://vyu.cc
```

本地评审时两处 origin 都改为 `http://127.0.0.1:4193`。第一条命令显示 8 位短码并等待。登录同一站点，进入「连接 Agent」，输入短码，核对设备、账号、分组后点击「允许连接」。连接器持有独立随机证明，凭据仅通过兑换响应送到本机进程并保存至 macOS 钥匙串；第二条命令为 Codex 登记 stdio 连接器。连接后用 `list_groups` 确认权限。在「设备与密钥」中断开某台设备后，该凭据的下一次调用返回 401。组授权收回后，设备随账号失去相应组权限。配对有效期为 5 分钟，超时、拒绝或领取后不能再次兑换。若领取响应丢失，断开该设备后重新配对。

首次发现工具时，连接器先完成 `initialize`，随后发送 `notifications/initialized` 并允许 `tools/list` 与其响应并行等待。两项均成功才将工具目录交给客户端。每条消息仍使用独立的 HTTP POST；业务调用按现有顺序实时检查 Key、账号和组权限。替换本地连接器文件并重新启动客户端连接即可使用此优化，已有钥匙串凭据可继续使用。

其他支持远程 HTTP 的客户端可展开「手动 API Key 接入」，使用 **Streamable HTTP** 与 Bearer 鉴权。短码配对由本项目的连接器实现；普通 OAuth 登录客户端需要自行适配此配对协议。

| 工具 | 参数示例 |
|---|---|
| `list_groups` | `{}` |
| `list_links` | `{"group":"gome","q":"sale","limit":20}` |
| `create_link` | `{"group":"gome","code":"sale","url":"https://example.com/sale","expiresAt":7}` |
| `update_link` | `{"group":"gome","code":"sale","title":"活动入口","expiresAt":null}` |
| `set_group_default` | `{"group":"gome","defaultCode":"sale"}` |

客户端先执行 `initialize` 和 `tools/list` 发现工具，然后用 `tools/call` 调用。成功结果中 `structuredContent.link.shortUrl` 与后台复制的品牌地址一致。已认证但无分组权限时，工具响应为 `isError: true`，业务状态码在 `structuredContent.status`。撤权后再次列出组只返回剩余授权；Key 自身失效时端点返回 HTTP 401。

### 分组与默认入口

在后台生成 API Key 后，以 `Authorization: Bearer <key>` 调用下列接口。所有路径相对于 `/api/v1`，请求和响应均为 JSON。已有根短链沿用原地址、原存储键和管理接口。

| 操作 | 方法和路径 | 请求体或说明 |
|---|---|---|
| 创建组 | `POST /groups` | `{"name":"gome"}`。可选 `expiresAt` 控制入口有效期 |
| 查看组 | `GET /groups`、`GET /groups/gome` | 返回 `name`、`shortUrl`、`defaultCode`、`expiresAt` |
| 设默认、清空、调整入口有效期 | `PATCH /groups/gome` | `{"defaultCode":"summer"}`、`{"defaultCode":null}` 或 `{"expiresAt":30}`；仅更新传入字段 |
| 创建组内短链 | `POST /links` | `{"group":"gome","url":"https://example.com/summer","code":"summer","expiresAt":7}`。省略 `code` 自动生成，省略 `group` 创建根短链 |
| 列出组内成员 | `GET /links?group=gome` | 可叠加 `q`、`status`、`limit`、`cursor`；空 `group=` 只列根短链 |
| 操作一个成员 | `GET /links/gome/summer`、`PATCH /links/gome/summer`、`DELETE /links/gome/summer` | 可修改目标、备注、短码、组和有效期；设 `group:""` 移至根路径 |
| 显式升级旧根短链 | `POST /groups` | `{"name":"gome","upgradeRoot":true}` 将原目标和历史计数保存在 `gome/home`，设为组默认；普通创建遇占用返回 409 |

组名限 1–16 位，以小写英文字母开头，可含小写字母、数字、连字符。系统保留路径不可使用。根路径与组名共用一级地址，短码在各组内独立。响应中的 `code` 为末段，`path` 为完整路径（如 `gome/summer`）。

`expiresAt` 支持未来的带时区 ISO 时间、从请求时起的整数天数（1–36500），或 `null` 设为永久。组到期仅关闭入口。成员到期时，无论直接访问还是经默认入口都会返回 410。默认项须为本组有效成员，删除、改码或移出默认项前，先切换或清空默认。无默认或短码不存在返回 404。管理调用中未授权返回 401，路径占用或并发修改返回 409，参数无效返回 422。

本地调用示例（先在预览后台生成临时 Key，并在终端设置 `EDGESHORT_KEY`）：

```sh
BASE=http://127.0.0.1:4179/api/v1
curl -sS "$BASE/groups" -H "Authorization: Bearer $EDGESHORT_KEY"
curl -sS -X POST "$BASE/links" -H "Authorization: Bearer $EDGESHORT_KEY" \
  -H 'Content-Type: application/json' -d '{"group":"gome","code":"sale","url":"https://example.com/sale","expiresAt":7}'
curl -sS -X PATCH "$BASE/groups/gome" -H "Authorization: Bearer $EDGESHORT_KEY" \
  -H 'Content-Type: application/json' -d '{"defaultCode":"sale"}'
curl -sS -D - -o /dev/null http://127.0.0.1:4179/gome
```

### 分组主域名

管理员选中分组 Tab →「配置主域名」，在 Makers 核对归属、CNAME 和 HTTPS 后保存并启用。更换时一次切换；确认之前旧域名继续可用。保留原有绑定，历史待审记录仅供管理员启用或驳回。普通用户可以使用本组地址。每组最多一个主域名，同一域名只能归属于一个组。

管理员会话接口 `POST /api/groups/:name/domain` 接受 `{"action":"configure","hostname":"go.example.com"}`；替换时传入当前绑定的 `id`。解绑用 `unbind`，处理旧待审记录用 `approve` 或 `reject`。普通用户对域名变更操作均返回 403。Bearer API 和 MCP 提供地址查询，不提供域名配置工具。

组入口和短链响应都有三个字段：`platformUrl` 是平台地址，`brandUrl` 是已启用的品牌地址（未配置为 `null`），`shortUrl` 优先返回品牌地址，否则返回平台地址。两个地址读同一条记录，共用有效期、目标和计数。后台每种地址独立复制和生成二维码；公开品牌域名上的 `/` 指向组默认成员，`/sale` 只解析本组的成员。


### 用户管理与按组授权

站点管理员使用首次配置时创建的账号和密码。打开「用户管理」可创建普通账号，勾选已有分组，调整授权或停用账号。一个分组可授权多人；根短链、创建分组、旧根路径升级及用户管理由管理员负责。普通账号可维护获授权组内的短链、有效期和默认成员，跨组移动需同时拥有两个组的权限。

后台 Cookie 和 Bearer Key 每次管理请求都会强一致读取所属账号的启用状态及组授权。撤权保存后，后续管理请求使用最新权限。已打开的普通用户页面在重新聚焦、刷新或可见页面的 15 秒检查时同步。已签发的 Key 随账号授权变化；停用账号后所有 Key 暂停工作，重新启用后未撤销的 Key 恢复。停用前的登录会话需重新登录。公开跳转独立于后台权限。

用户管理端点仅接受站点管理员的登录会话：

| 方法和路径 | 操作 |
|---|---|
| `GET /api/users` | 查看普通账号、启用状态、授权组和修订号 |
| `POST /api/users` | 传入 `username`、`password`、`groups` 创建普通账号 |
| `PATCH /api/users/:username` | 用 `groups` 替换授权列表，空数组收回全部组；用 `enabled` 启停账号。可传上次读取的 `revision` 防止覆盖其他管理员操作 |

历史无 owner 的 Key 归原站点管理员；新增 Key 绑定签发账号。各账号可列出并撤销自己签发的 Key。任何管理授权变更都不修改已发布短链的地址与目标。

### 可用性与恢复验收

运行 `npm run test:ha`。演练从空存储创建测试管理员和短链，两个真实 Node 进程共享本机原子对象存储夹具。它验证顺序点击后强制终止并重启、双实例并发、一个进程退出后另一个继续服务，再停写、生成全量快照并恢复到独立空目录。逐对象 SHA-256、管理员密码、既有会话、API Key、权限、域名、默认成员、目标与计数均需通过；演练数据在结束后清理。

生产备份应在一致性时间点覆盖整个 `edgeshort-links` 命名空间，包括 `system/`、用户、Key、分组目录、域名和计数分片，备份私密保存。恢复时先隔离写流量，在独立目标核对对象与访问路径后切换。全新部署不依赖旧版数据或账号。此演练不模拟腾讯云跨可用区容灾。

### 本地评审

运行 `npm test` 执行单元与 HTTP 测试。运行 `node test/preview.mjs 4181`，打开 `http://127.0.0.1:4181/admin/`，演示管理员为 `admin` / `preview-only`。两个品牌地址是 `http://gome.localhost:4181/sale` 和 `http://events.localhost:4181/sale`；这个模式使用内存数据，重启会恢复样例。

运行 `node test/preview.mjs 4182 --fresh` 可体验无预置管理员的首次配置。此模式只监听回环接口，自动提供本地设置证明；数据保存在当前用户系统临时目录下的 `edgeshort-local-4182` 中，重启同一端口继续使用。真实 Makers 使用私有 Blob 和一次性设置码。

### Query and response

`GET /api/v1/links` 与 MCP 的 `list_links` 使用同一个分页查询。后台每页 20 条，API 默认 100 条（1–500）。结果按授权分组范围及 Blob 对象键顺序返回。下一次请求带上 `nextCursor` 作为 `cursor` 并保留原分组、关键词和状态；权限变化或切换筛选后从首页重新开始。关键词和状态按批扫描，稀疏搜索可能返回空页和可继续使用的游标。只为当前页读取计数。游标模式未扫描全部数据时 `total` 为 null。显式使用 `offset` 时可获得准确的总数，但需要扫描匹配范围；它和游标互斥。后台顶部的链接和访问统计仅对应当前页。

Every link looks like:

```json
{
  "code": "summer-26",
  "shortUrl": "https://your-domain.com/summer-26",
  "url": "https://example.com/campaign",
  "title": "Summer campaign",
  "status": "active",
  "expiresAt": "2026-08-03T00:00:00.000Z",
  "visits": 12,
  "lastVisitAt": "2026-07-31T08:12:00.000Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```

`POST` requires `url`; `POST` and `PATCH` accept `url`, plus optional `code`, `title`, and `expiresAt`. Pass `expiresAt` as a whole number of days (for example, `3` expires in three days); ISO date/time strings and an empty value (never expires) also work. Custom codes must be 1–16 characters and use only letters, numbers, `_`, or `-`. A destination that points at a short link on this same site is rejected, because it could redirect in a loop. Errors are JSON: `{ "error": "..." }`.

## Project layout

```text
admin/                    # Plain HTML, CSS, and browser JavaScript
cloud-functions/api/      # Node.js: initial setup, login and user administration
edge-functions/
  [code].js               # Public redirect (hot path)
  _redirect.js            # Link cache + coalesced visit counting
  _links.js               # Link logic shared by the admin API and /api/v1
  _storage.js             # Blob keys and reads/writes
  _ratelimit.js           # Login failure limiter
  api/auth/*              # Session check and logout
  api/links/*             # Admin (session) API
  api/v1/links/*          # Public (API key) API
  api/api-keys/*          # API key management
test/                     # `npm test` (in-memory Blob stand-in, no network)
```

## Operational notes

- **Group entry caching**: the root routing decision and resolved default are cached separately for up to 60 seconds per node. A move to a different default therefore takes at most this cache window on other nodes. Entry and member deadlines are checked on every hit. One entry visit is attributed to its member.
- **Management writes**: mutations sharing a root use create-if-absent Blob locks. A concurrent caller can retry a 409. If a function is killed before cleanup, inspect its timestamp and verify no writer is active before recovering its specific lock.
- **Redirect caching**: every valid visit still executes the redirect function and its best-effort counter. Permanent mappings are cached for up to 24 hours in the EO node's private function cache. The function also keeps recently read mappings in memory for 30 seconds. Expiring links only use that brief memory cache and their deadline is checked on every visit. Clients receive a 302 with `Cache-Control: no-store`. The `X-EdgeShort-Cache` response header reports `edge` (EO node), `instance` (warm function), `group` (group entry), or `miss` (Blob lookup).
- Editing, renaming, deleting or reusing a code evicts its mapping on the handling node for the current origin, on a best-effort basis. Other nodes and domain aliases may still serve the old permanent destination for up to 24 hours, including after a permanent link is given an expiration date.
- **Visit persistence**: each successful GET normally waits for a durable per-writer cumulative shard, keyed by stable link ID. Concurrent writers use different objects; coalesced requests share a commit. A retry writes the same absolute count. HEAD, missing and expired links are not visits. `X-EdgeShort-Visit: stored` confirms the commit. If both writes fail, an otherwise usable redirect still returns 302 with `degraded` and a warning; such visits cannot be guaranteed. Persistence adds a Blob write to the normal redirect path. Shards accumulate as writers turn over; account for them when estimating cost and planning retention.
- **API keys** embed their id (`esk_<id>.<secret>`), so the credential is retrieved directly. Member keys also read their account with strong consistency on every request. Keys issued by older versions keep working through a slower scan. `lastUsedAt` is written at most every 10 minutes.
- **Login limiter**: 5 wrong passwords within 15 minutes locks that client IP out for the rest of the window. The IP comes from `EO-Connecting-IP` (falling back to `X-Real-IP` / `X-Forwarded-For`).
- **Sessions** use signed cookies; member sessions also verify the current account and its session version; the signing key persists in the private installation record.
- `PATCH` only changes the fields you send.
- Admin static files (`app.js`, `style.css`, `qrcode.min.js`) are cached for a day; bump the `?v=` in `admin/index.html` whenever you change them.
- `.github/workflows/test.yml` runs `npm test` on every push and pull request.
- Redirects return `302`, so changing a destination never fights a browser's permanent cache.
- Keep the private installation record and bootstrap code out of source control.
