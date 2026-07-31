function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function shortLinkErrorPage({ status, code, title, message }) {
  const safeCode = code ? `/${escapeHtml(code)}` : "—";
  const pageTitle = `${title} · EdgeShort`;
  return new Response(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><meta name="theme-color" content="#090f1f"><title>${pageTitle}</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}body{min-width:320px;min-height:100vh;margin:0;display:grid;place-items:center;padding:28px;color:#f3f6ff;background:radial-gradient(760px 470px at 2% -8%,rgba(47,89,184,.34),transparent 70%),radial-gradient(620px 390px at 100% 100%,rgba(94,68,190,.24),transparent 70%),#090f1f}.card{width:min(100%,540px);overflow:hidden;border:1px solid #2e4164;border-radius:22px;background:linear-gradient(145deg,rgba(23,35,61,.95),rgba(12,20,37,.96));box-shadow:0 30px 100px rgba(0,0,0,.38)}.content{padding:clamp(30px,7vw,52px)}.mark{display:grid;width:44px;height:44px;place-items:center;border-radius:14px;color:#071426;background:linear-gradient(135deg,#c2dbff,#91a7ff);box-shadow:0 9px 28px rgba(111,153,255,.23);font-size:24px;font-weight:900}.eyebrow{display:block;margin-top:28px;color:#91b7ff;font-size:11px;font-weight:800;letter-spacing:.15em}h1{margin:10px 0 12px;font-size:clamp(28px,6vw,42px);letter-spacing:-.065em;line-height:1.06}p{max-width:400px;margin:0;color:#aab8d4;font-size:15px;line-height:1.72}.link{margin-top:27px;padding:13px 15px;border:1px solid rgba(146,181,245,.18);border-radius:11px;color:#bed2ff;background:rgba(5,11,26,.35);font-size:14px;font-weight:700;word-break:break-all}.foot{padding:17px clamp(30px,7vw,52px);border-top:1px solid rgba(117,145,194,.18);color:#7484a4;font-size:12px}.foot b{color:#b8c9e8;font-weight:700}@media(max-width:420px){body{padding:16px}.content{padding:30px 25px}.foot{padding:16px 25px}}</style>
</head><body><main class="card"><div class="content"><div class="mark">↗</div><span class="eyebrow">EDGESHORT · ${status}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><div class="link">${safeCode}</div></div><div class="foot"><b>EdgeShort</b> · 请联系链接分享者获取最新地址</div></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
