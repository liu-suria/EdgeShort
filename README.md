# Edge Short

一个部署在 EdgeOne Makers 的私人短链接服务：独立后台、密码登录、短链增删改查、复制链接和访问次数统计。

## 功能

- 根路径短链：`https://你的域名/Ab3xYz`
- 独立后台：`/admin/`
- 密码登录，密码只保存在 EdgeOne Secret
- 自动或自定义短码
- 标题、原链接编辑
- 累计访问统计
- 无第三方数据库、无前端框架、无构建依赖

## EdgeOne Makers 配置

### 1. 创建项目

从 GitHub 导入本仓库。项目为纯静态文件 + `edge-functions`，通常无需填写构建命令；输出目录使用仓库根目录。

### 2. 开通并绑定 KV

1. 在 Makers 控制台开通 KV Storage。
2. 创建命名空间，例如 `edge-short`。
3. 将该命名空间绑定到项目，变量名必须填写：`SHORT_KV`。

### 3. 配置环境变量 / Secret

| 名称 | 类型 | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | 后台登录密码 |
| `SESSION_SECRET` | Secret | 用于签名登录 Cookie，建议至少 32 位随机字符串 |

随机 Secret 可在本地执行：

```bash
openssl rand -hex 32
```

### 4. 部署

保存配置后重新部署。访问 `/admin/` 登录并创建第一条短链。

## 注意事项

- KV 是最终一致存储，其他边缘节点最多可能在约 60 秒内读到旧值。
- 当前访问次数采用轻量计数方式；个人低并发使用足够，高并发下可能出现少量计数覆盖。
- 删除短链后，少数边缘节点可能短时间仍能访问旧缓存。
- 请勿把 `ADMIN_PASSWORD` 或 `SESSION_SECRET` 写入 GitHub 仓库。
