const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

// One entry per failure a visitor can meet. `status` is the HTTP status sent.
const KINDS = {
  invalid: { status: 404, badge: "链接无效", icon: "🧭", title: "这个链接地址不对", message: "短码里有不能识别的字符，或者复制时少了几位。请回到分享者那里，再要一次完整的链接。" },
  missing: { status: 404, badge: "链接不存在", icon: "🍂", title: "没有找到这个链接", message: "它可能已被删除、改了短码，或者从来没有创建过。" },
  expired: { status: 410, badge: "链接已过期", icon: "⏳", title: "这个链接已经过期", message: "它的有效期已经结束。请向分享者索取新的链接。" },
  error: { status: 503, badge: "暂时无法访问", icon: "🔧", title: "链接暂时打不开", message: "服务刚刚开了个小差，不是你的问题。请稍等几秒再刷新。" },
};

const LOGO = `<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="18" r="11" fill="#f2762e"/><path d="M16 7c-3 0-5 1.600-6 3 2-.4 4 .2 6 1 2-.8 4-1.400 6-1-1-1.400-3-3-6-3Z" fill="#6f8f3a"/><path d="M16 5v4" stroke="#4d6a24" stroke-width="2" stroke-linecap="round"/></svg>`;

const STYLE = `:root{color-scheme:light dark;--bg:#fff7ec;--card:#fffdf9;--ink:#3a2314;--muted:#8a6a55;--line:#f1dcc4;--accent:#e8651c;--accent-soft:#fde6d0;font-family:ui-sans-serif,system-ui,-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
@media(prefers-color-scheme:dark){:root{--bg:#1f1510;--card:#2a1c14;--ink:#fbeedd;--muted:#c3a58d;--line:#43301f;--accent:#ff8a3d;--accent-soft:#4a2c17}}
*{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px;color:var(--ink);background:radial-gradient(640px 380px at 90% -5%,var(--accent-soft),transparent 70%),var(--bg)}
.card{width:min(100%,520px);border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:0 24px 60px rgba(120,60,10,.12);overflow:hidden}
.body{padding:clamp(28px,7vw,48px)}.brand{display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.02em}
.badge{display:inline-flex;align-items:center;gap:8px;margin-top:30px;padding:6px 12px;border-radius:99px;background:var(--accent-soft);color:var(--accent);font-size:13px;font-weight:700}
h1{margin:14px 0 10px;font-size:clamp(26px,6vw,34px);line-height:1.2;letter-spacing:-.02em}
p{margin:0;max-width:30em;color:var(--muted);font-size:15px;line-height:1.8}
.code{margin-top:24px;padding:12px 14px;border:1px dashed var(--line);border-radius:12px;color:var(--ink);font:600 14px ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.foot{display:flex;justify-content:space-between;gap:12px;padding:16px clamp(28px,7vw,48px);border-top:1px solid var(--line);color:var(--muted);font-size:13px}.foot a{color:var(--accent);font-weight:700;text-decoration:none}`;

export function shortLinkErrorPage(kind, code) {
  const info = KINDS[kind] || KINDS.error;
  const shown = code ? `/${escapeHtml(String(code).slice(0, 40))}` : "";
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="theme-color" content="#fff7ec"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon.ico" sizes="48x48"><title>${escapeHtml(info.badge)} · 柿柿短链</title><style>${STYLE}</style></head>
<body><main class="card"><div class="body"><div class="brand">${LOGO}<span>柿柿短链</span></div><span class="badge"><span aria-hidden="true">${info.icon}</span>${escapeHtml(info.badge)}</span><h1>${escapeHtml(info.title)}</h1><p>${escapeHtml(info.message)}</p>${shown ? `<div class="code">${shown}</div>` : ""}</div><div class="foot"><span>错误代码 ${info.status}</span><a href="/">回到首页</a></div></main></body></html>`;
  return new Response(html, { status: info.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...(info.status === 503 ? { "Retry-After": "5" } : {}) } });
}
