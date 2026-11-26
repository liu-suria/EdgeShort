# EdgeShort · Agent 接入指南

使用平台管理域名（正式站为 `https://vyu.cc`）。品牌域名用于访客跳转。支持远程 MCP 的 Agent 可直接发现五个工具；支持 OpenAPI 导入的 Agent 可读取同目录的 [openapi.json](./openapi.json)。导入本地文件时，将 REST 服务地址设为平台域名下的 `/api/v1`。

## macOS 设备配对

从「连接 Agent → 首次使用本地连接器」下载单文件连接器。需要 Node.js 20+ 和 macOS 钥匙串。把文件放入固定目录，在该目录执行：

```sh
node ./edgeshort.mjs pair --origin https://vyu.cc
codex mcp add edgeshort -- node "$PWD/edgeshort.mjs" serve --origin https://vyu.cc
```

第一条命令显示 5 分钟有效的短码并等待。登录对应平台并核对设备名称和授权范围后点击「允许连接」，然后运行第二条命令。Agent 可以在聊天中传递显示短码；客户端的私密证明及兑换得到的 Key 应留在本机连接器。用“列出我能管理的分组”验证，在后台「设备与密钥」可随时断开。

## 手动 Bearer 凭据

登录后台 →「连接 Agent」→「手动 API Key 接入」→ 生成 API Key。将完整 Key 放进 Agent 的凭据管理器或调用进程的 `EDGESHORT_KEY` 环境变量。示例从这个变量读取。每次调用都会检查账号当前的分组授权。用 `list_groups` 或 `GET /api/v1/groups` 获取可选组；空列表表示尚未获授权。根路径和建组由管理员管理。

## MCP 接入

| 配置项 | 值 |
|---|---|
| 传输 | Streamable HTTP |
| 服务地址 | `https://vyu.cc/api/mcp` |
| 认证 | Bearer；请求头为 `Authorization: Bearer <API Key>` |
| 协议 | `2025-11-25`，亦支持 `2025-06-18`、`2025-03-26` |

连接后先发现工具。下表中的 `gome` 代表一个已获授权的组，`sale` 代表组内短码。

| 工具 | 用途 | arguments 示例 |
|---|---|---|
| `list_groups` | 查看组、品牌和平台入口、默认成员 | `{}` |
| `list_links` | 查询短链与访问数，支持关键词、状态和翻页 | `{"group":"gome","q":"sale","limit":20}` |
| `create_link` | 创建短链，省略 code 会自动生成 | `{"group":"gome","url":"https://example.com/campaign","expiresAt":7}` |
| `update_link` | 修改目标、备注或有效期，仅传需要改的字段 | `{"group":"gome","code":"sale","title":"夏季活动","expiresAt":null}` |
| `set_group_default` | 切换组入口指向；传 null 清空 | `{"group":"gome","defaultCode":"sale"}` |

**可运行示例（Python 3 标准库）**。执行初始化、工具发现、一次只读调用。预先设置 `EDGESHORT_KEY`；本地测试可用 `EDGESHORT_ORIGIN` 覆盖服务域名。

```python
import json
import os
from urllib.request import Request, urlopen

origin = os.environ.get("EDGESHORT_ORIGIN", "https://vyu.cc").rstrip("/")
headers = {
    "Authorization": "Bearer " + os.environ["EDGESHORT_KEY"],
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}

def rpc(method, params, request_id=None):
    message = {"jsonrpc": "2.0", "method": method, "params": params}
    if request_id is not None:
        message["id"] = request_id
    req = Request(origin + "/api/mcp", json.dumps(message).encode(), headers)
    with urlopen(req, timeout=20) as response:
        if response.status == 202:
            return None
        reply = json.load(response)
    if "error" in reply:
        raise RuntimeError(reply["error"])
    result = reply["result"]
    if result.get("isError"):
        raise RuntimeError(result["structuredContent"])
    return result

hello = rpc("initialize", {"protocolVersion": "2025-11-25", "capabilities": {},
                           "clientInfo": {"name": "short-link-agent", "version": "1.0"}}, 1)
headers["MCP-Protocol-Version"] = hello["protocolVersion"]
rpc("notifications/initialized", {})
print([tool["name"] for tool in rpc("tools/list", {}, 2)["tools"]])
print(rpc("tools/call", {"name": "list_groups", "arguments": {}}, 3)["structuredContent"])
```

需要创建时，在上述代码后追加以下调用，并把 `EDGESHORT_GROUP` 设为上一步返回的组名：

```python
result = rpc("tools/call", {"name": "create_link", "arguments": {
    "group": os.environ["EDGESHORT_GROUP"], "url": "https://example.com/campaign",
    "title": "Agent 示例", "expiresAt": 7}}, 4)
print(result["structuredContent"]["link"]["shortUrl"])
```

## REST 接口

所有路径相对于 `/api/v1`。使用 `Authorization: Bearer <API Key>`（或 `X-API-Key`）。带请求体时使用 `Content-Type: application/json`。

| 方法和路径 | 请求 / 返回 |
|---|---|
| GET /groups | `200 {groups:[…]}`，仅包含有权访问的组 |
| POST /groups | 管理员传 `name`，可选 `expiresAt`；`201 {group:…}` |
| GET /groups/{name} | `200 {group:…}` |
| PATCH /groups/{name} | 传 `defaultCode` 或 `expiresAt`；默认成员必须属于该组且未过期 |
| GET /links | 分页查询，返回 `links`、`hasMore`、`nextCursor`、`total`、`limit`、`offset` |
| POST /links | 必传 `url`；普通用户还须传已授权的 `group`。可选 `code`、`title`、`expiresAt`；`201 {link:…}` |
| GET /links/{group}/{code} | `200 {link:…}`，含两种公开地址及访问数 |
| PATCH /links/{group}/{code} | 修改目标、备注、有效期、短码或分组；跨组移动须有两组权限；`200 {link:…}` |
| DELETE /links/{group}/{code} | `204`，响应体为空。默认成员须先取消默认或切换默认成员 |
| GET / PATCH / DELETE /links/{code} | 管理员对根短链使用同样的详情、修改、删除接口 |

`expiresAt` 可传 1–36500 的整数（天数，从请求时起算）、未来的带时区 ISO 时间，或 `null` 设为永久。省略该字段时，新建链接永久有效，修改已有链接会保留原有效期。

**先查权限，再创建（curl）**

```sh
BASE="${EDGESHORT_ORIGIN:-https://vyu.cc}/api/v1"
curl --fail-with-body -sS "$BASE/groups" -H "Authorization: Bearer $EDGESHORT_KEY"
```

下例假设账号可管理 `gome`；按实际授权替换组名。

```sh
curl --fail-with-body -sS "$BASE/links" \
  -H "Authorization: Bearer $EDGESHORT_KEY" -H 'Content-Type: application/json' \
  -d '{"group":"gome","url":"https://example.com/campaign","title":"Agent 示例","expiresAt":7}'
```

**如何使用响应。** REST 创建结果在 `link`，MCP 创建结果在 `result.structuredContent.link`。以下为返回字段节选：

```json
{"link":{"group":"gome","code":"abc123","path":"gome/abc123","shortUrl":"https://go.example.org/abc123","brandUrl":"https://go.example.org/abc123","platformUrl":"https://vyu.cc/gome/abc123","status":"active","visits":0}}
```

分享时直接使用 `shortUrl`；它优先返回品牌地址。未配置主域名时，`brandUrl` 为 `null`，`shortUrl` 等于 `platformUrl`。保留 `path` 或 `group` 和 `code` 供后续查询、更新。

**翻页。** `GET /links` 和 `list_links` 支持 `group`、`q`、`status`（active / expired）和 `limit`（默认 100，最大 500）。原样保留筛选，使用上一页的 `nextCursor` 作下一页的 `cursor`，REST 查询参数须 URL 编码，直到 `hasMore` 为 false。稀疏搜索中可能出现空页；游标模式的 `total` 可能为 null。按 `offset` 查询可获得准确总数，不能同时使用 `cursor`。

## 错误处理

| 状态 | Agent 的处理 |
|---|---|
| 401 | 检查 Key 是否正确、是否已被撤销，账号是否停用 |
| 403 | 查询授权分组，确认操作权限；撤权后原 Key 会立即失去该组管理权 |
| 404 | 核对管理路径中的组名和短码 |
| 409 | 查看具体错误；自定义短码占用时先查询现有链接，默认成员冲突时先处理组默认 |
| 422 | 根据 `error` 修正参数、有效期、目标 URL 或游标 |

REST 失败时读取 JSON 的 `error` 字段。MCP 需分别检查 HTTP 状态、JSON-RPC 的 `error` 和工具结果的 `isError`。工具执行失败时，从 `structuredContent.status` 和 `structuredContent.error` 读取原因。创建请求超时后先查询是否已创建；自动短码创建重试可能生成第二条链接。
