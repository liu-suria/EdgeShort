(() => {
  const translations = {
    zh: {
      adminConsole: "链接管理", privateAdmin: "私有管理后台", welcomeBack: "欢迎回来", signInDescription: "登录后管理你的短链接。", password: "密码", show: "显示", hide: "隐藏", signIn: "登录", signOut: "退出登录",
      yourLinks: "你的短链接", shortLinksTitle: "所有短链接，尽在一处。", shortLinksDescription: "创建、管理和追踪每一条链接。", storageReady: "存储已就绪", newLink: "新建链接", totalLinks: "链接总数", totalVisits: "访问总数", allLinks: "全部链接", loading: "加载中…", loadingLinks: "正在加载链接", searchLinks: "搜索链接", noLinks: "还没有链接", noLinksDescription: "新建第一条短链接，它会显示在这里。", remark: "备注", destination: "目标地址", visits: "访问", updated: "更新时间", actions: "操作",
      destinationUrl: "目标链接", label: "备注名称", optional: "可选", labelPlaceholder: "例如：夏日活动", customCode: "自定义短码", codeFormat: "1–16 位", codeHelp: "留空将自动生成安全短码。", editCodeHelp: "可修改短码；保存后旧短码将失效。", expiresAt: "过期时间", expiresInDays: "有效天数", expiryDaysPlaceholder: "例如：3", days: "天", neverExpires: "永不过期", expiryHelp: "填写 3 表示保存后 3 天到期；留空表示永不过期。", expires: "过期：{date}", cancel: "取消", editLink: "编辑链接", createShortLink: "新建短链接", editShortLink: "编辑短链接", saveChanges: "保存修改", copy: "复制", edit: "编辑", delete: "删除", copied: "短链接已复制", copyFailed: "复制失败，请手动复制链接", deleteConfirm: "确定删除 /{code} 吗？此操作无法撤销。", deleted: "链接已删除", updatedToast: "链接已更新", created: "链接已创建", linkCount: "{count} 条链接", oneLink: "1 条链接",
      apiAccess: "API 调用", apiTitle: "API 密钥", apiDescription: "使用 API 在自己的工具或自动化中管理短链接。", apiKeyName: "密钥名称", apiKeyNamePlaceholder: "例如：自动化脚本", generateApiKey: "生成 API Key", apiKeyCreated: "请立即保存此 API Key", apiKeyOnce: "为了安全起见，关闭后将无法再次查看完整密钥。", activeApiKeys: "API Keys", apiKeyCount: "{count} 个密钥", apiKeyNone: "还没有 API Key。生成一个用于 API 调用。", apiKeyLastUsed: "最近使用：{date}", apiKeyNeverUsed: "尚未使用", apiKeyRevoked: "已撤销", revoke: "撤销", revokeApiKeyConfirm: "撤销「{name}」？使用此密钥的 API 调用将立即失效。", apiKeyRevokedToast: "API Key 已撤销", apiKeyCopied: "API Key 已复制", apiExample: "调用示例", qrCode: "短链二维码", saveQrCode: "保存二维码", qrCodeFailed: "二维码生成失败，请刷新后重试",
      sessionMissing: "密码验证成功，但浏览器没有保存登录状态。请允许此网站使用 Cookie 后重试。", sessionUnknown: "无法确认登录状态，请刷新页面后重试。", invalidUrl: "请输入有效的 http:// 或 https:// 目标链接", serverError: "服务器错误（{status}）。请检查最新的 Edge Function 部署和项目密钥。", requestFailed: "请求失败（{status}）",
    },
    en: {
      adminConsole: "LINK MANAGEMENT", privateAdmin: "PRIVATE ADMIN", welcomeBack: "Welcome back.", signInDescription: "Sign in to manage your short links.", password: "Password", show: "Show", hide: "Hide", signIn: "Sign in", signOut: "Sign out",
      yourLinks: "YOUR LINKS", shortLinksTitle: "Short links, in one place.", shortLinksDescription: "Create, manage, and track every link.", storageReady: "Storage ready", newLink: "New link", totalLinks: "Total links", totalVisits: "Total visits", allLinks: "All links", loading: "Loading…", loadingLinks: "Loading links", searchLinks: "Search links", noLinks: "No links yet", noLinksDescription: "Create your first short link to see it here.", remark: "Remark", destination: "Destination", visits: "Visits", updated: "Updated", actions: "Actions",
      destinationUrl: "Destination URL", label: "Remark", optional: "optional", labelPlaceholder: "e.g. Summer campaign", customCode: "Custom code", codeFormat: "1–16 characters", codeHelp: "Leave empty to generate a secure short code.", editCodeHelp: "You can change the code. The previous short code will stop working.", expiresAt: "Expiration", expiresInDays: "Valid for", expiryDaysPlaceholder: "e.g. 3", days: "days", neverExpires: "Never expires", expiryHelp: "Enter 3 to expire the link three days after saving. Leave blank to never expire.", expires: "Expires: {date}", cancel: "Cancel", editLink: "EDIT LINK", createShortLink: "Create short link", editShortLink: "Edit short link", saveChanges: "Save changes", copy: "Copy", edit: "Edit", delete: "Delete", copied: "Short link copied", copyFailed: "Copy failed — please copy the link manually", deleteConfirm: "Delete /{code}? This cannot be undone.", deleted: "Link deleted", updatedToast: "Link updated", created: "Link created", linkCount: "{count} links", oneLink: "1 link",
      apiAccess: "API access", apiTitle: "API keys", apiDescription: "Use the API to manage short links from your own tools or automations.", apiKeyName: "Key name", apiKeyNamePlaceholder: "e.g. Automation script", generateApiKey: "Generate API key", apiKeyCreated: "Save this API key now", apiKeyOnce: "For security, the full key cannot be viewed again after this dialog is closed.", activeApiKeys: "API keys", apiKeyCount: "{count} keys", apiKeyNone: "No API keys yet. Generate one for API access.", apiKeyLastUsed: "Last used: {date}", apiKeyNeverUsed: "Never used", apiKeyRevoked: "Revoked", revoke: "Revoke", revokeApiKeyConfirm: "Revoke “{name}”? API calls using this key will stop immediately.", apiKeyRevokedToast: "API key revoked", apiKeyCopied: "API key copied", apiExample: "Example", qrCode: "Short-link QR code", saveQrCode: "Save QR code", qrCodeFailed: "Unable to generate the QR code. Refresh and try again.",
      sessionMissing: "Password accepted, but the browser did not save the session. Allow cookies for this site and try again.", sessionUnknown: "Unable to confirm the sign-in session. Refresh the page and try again.", invalidUrl: "Enter a valid http:// or https:// destination URL", serverError: "Server error ({status}). Check the latest Edge Function deployment and project secrets.", requestFailed: "Request failed ({status})",
    },
  };
  const savedLanguage = localStorage.getItem("edgeshort:language");
  const state = { links: [], apiKeys: [], editing: null, expiryDirty: false, searchTimer: null, language: savedLanguage === "en" ? "en" : "zh" };
  const $ = (selector) => document.querySelector(selector);
  const el = {
    loginView: $("#login-view"), dashboard: $("#dashboard"), loginForm: $("#login-form"), password: $("#password"), loginError: $("#login-error"), signOut: $("#sign-out"),
    totalLinks: $("#total-links"), totalVisits: $("#total-visits"), linksSummary: $("#links-summary"), search: $("#search"), loading: $("#loading-state"), empty: $("#empty-state"), tableWrap: $("#table-wrap"), table: $("#links-table"),
    dialog: $("#link-dialog"), linkForm: $("#link-form"), dialogTitle: $("#dialog-title"), dialogEyebrow: $("#dialog-eyebrow"), editingCode: $("#editing-code"), url: $("#link-url"), title: $("#link-title"), code: $("#link-code"), codeOptional: $("#code-optional"), codeHelp: $("#code-help"), codePrefix: $("#code-prefix"), expiresAt: $("#link-expires-at"), clearExpiry: $("#clear-expiry"), linkError: $("#link-error"), save: $("#save-link"), toast: $("#toast"), languageToggle: $("#language-toggle"),
    apiSettings: $("#api-settings"), apiDialog: $("#api-dialog"), apiBaseUrl: $("#api-base-url"), apiExample: $("#api-example"), apiKeyForm: $("#api-key-form"), apiKeyName: $("#api-key-name"), generateApiKey: $("#generate-api-key"), apiKeyResult: $("#api-key-result"), apiKeyValue: $("#api-key-value"), copyApiKey: $("#copy-api-key"), apiKeysSummary: $("#api-keys-summary"), apiKeysList: $("#api-key-list"),
  };

  function t(key, values = {}) { return (translations[state.language][key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
  function applyLanguage() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    document.title = state.language === "zh" ? "EdgeShort — 管理后台" : "EdgeShort — Admin";
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    el.languageToggle.textContent = state.language === "zh" ? "EN" : "中文";
    el.languageToggle.setAttribute("aria-label", state.language === "zh" ? "Switch to English" : "切换至中文");
    if (el.dialog.open) el.codeHelp.textContent = state.editing ? t("editCodeHelp") : t("codeHelp");
    if (el.apiDialog.open) renderApiKeys();
    if (state.links.length) renderLinks();
  }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
  function origin() { return window.location.origin; }
  function shortUrl(code) { return `${origin()}/${code}`; }
  function formatNumber(value) { return new Intl.NumberFormat(state.language === "zh" ? "zh-CN" : "en-US").format(Number(value) || 0); }
  function formatDate(value) { try { return new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); } catch { return "—"; } }
  function formatExpiryDate(value) { try { return new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en-US", state.language === "zh" ? { year: "numeric", month: "long", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); } catch { return "—"; } }
  function formatDateTime(value) { try { return new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); } catch { return "—"; } }
  function remainingDays(value) { const expiresAt = Date.parse(value); if (!Number.isFinite(expiresAt)) return ""; return String(Math.max(1, Math.ceil((expiresAt - Date.now()) / 86_400_000))); }
  function showToast(message) { el.toast.textContent = message; el.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2600); }
  async function request(path, options = {}) {
    const response = await fetch(path, { credentials: "include", cache: "no-store", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }, ...options });
    const text = response.status === 204 ? "" : await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      const fallback = response.status >= 500
        ? t("serverError", { status: response.status })
        : t("requestFailed", { status: response.status });
      const error = new Error(data?.error || fallback);
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function setLoading(loading) { el.loading.hidden = !loading; if (loading) { el.empty.hidden = true; el.tableWrap.hidden = true; } }
  function renderLinks() {
    const links = state.links;
    el.totalLinks.textContent = formatNumber(links.length);
    el.totalVisits.textContent = formatNumber(links.reduce((sum, link) => sum + (Number(link.visits) || 0), 0));
    el.linksSummary.textContent = links.length === 1 ? t("oneLink") : t("linkCount", { count: formatNumber(links.length) });
    el.empty.hidden = links.length !== 0;
    el.tableWrap.hidden = links.length === 0;
    el.table.innerHTML = links.map((link) => {
      const short = shortUrl(link.code);
      const remark = link.title ? escapeHtml(link.title) : "—";
      const expiry = link.expiresAt
        ? `<span class="expiry">${formatExpiryDate(link.expiresAt)}</span>`
        : `<span class="expiry expiry-never">${t("neverExpires")}</span>`;
      return `<tr><td class="remark-cell" title="${escapeHtml(link.title || "")}">${remark}</td><td class="code-cell"><div class="short-code-control"><a class="short-url" target="_blank" rel="noopener noreferrer" href="${escapeHtml(short)}">/${escapeHtml(link.code)}</a><div class="qr-control"><button class="qr-trigger" type="button" data-qr="${escapeHtml(link.code)}" aria-label="${escapeHtml(t("qrCode"))}" title="${escapeHtml(t("qrCode"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4V4Zm2 2v2h2V6H6Zm8-2h6v6h-6V4Zm2 2v2h2V6h-2ZM4 14h6v6H4v-6Zm2 2v2h2v-2H6Zm7-2h2v2h-2v-2Zm3 0h4v2h-2v2h2v2h-4v-2h-2v-2h2v-2Zm-3 4h2v2h-2v-2Z"/></svg></button><div class="qr-popover" role="group" aria-label="${escapeHtml(t("qrCode"))}" hidden><div class="qr-canvas"></div><span class="qr-caption">${escapeHtml(t("qrCode"))}</span><button class="qr-download" type="button" data-download-qr="${escapeHtml(link.code)}">${escapeHtml(t("saveQrCode"))}</button></div></div></div></td><td><a class="destination" target="_blank" rel="noopener noreferrer" href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a></td><td class="number">${formatNumber(link.visits)}</td><td>${expiry}</td><td><span class="date">${formatDate(link.updatedAt)}</span></td><td><div class="row-actions"><button class="row-action" type="button" data-copy="${escapeHtml(link.code)}">${t("copy")}</button><button class="row-action" type="button" data-edit="${escapeHtml(link.code)}">${t("edit")}</button><button class="row-action delete" type="button" data-delete="${escapeHtml(link.code)}">${t("delete")}</button></div></td></tr>`;
    }).join("");
  }
  async function loadLinks() {
    setLoading(true);
    try { const query = el.search.value.trim(); const data = await request(`/api/links${query ? `?q=${encodeURIComponent(query)}` : ""}`); state.links = data.links || []; renderLinks(); }
    catch (error) { if (error.status === 401) return showLogin(); showToast(error.message); state.links = []; renderLinks(); }
    finally { setLoading(false); }
  }
  function showLogin(message = "") {
    if (el.dialog.open) el.dialog.close();
    el.dashboard.hidden = true;
    el.signOut.hidden = true;
    el.loginView.hidden = false;
    if (message) el.loginError.textContent = message;
    setTimeout(() => el.password.focus(), 0);
  }
  function showDashboard() {
    sessionStorage.removeItem("edgeshort:pending-login");
    el.loginError.textContent = "";
    el.loginView.hidden = true;
    el.dashboard.hidden = false;
    el.signOut.hidden = false;
    loadLinks();
  }
  function openDialog(link = null) {
    state.editing = link; state.expiryDirty = false;
    el.linkForm.reset(); el.linkError.textContent = ""; el.editingCode.value = link?.code || "";
    el.dialogEyebrow.textContent = link ? t("editLink") : t("newLink"); el.dialogTitle.textContent = link ? t("editShortLink") : t("createShortLink"); el.save.textContent = link ? t("saveChanges") : t("newLink");
    el.codePrefix.textContent = origin(); el.code.value = link?.code || ""; el.code.required = Boolean(link); el.codeOptional.hidden = Boolean(link); el.codeHelp.textContent = link ? t("editCodeHelp") : t("codeHelp");
    if (link) { el.url.value = link.url; el.title.value = link.title || ""; el.expiresAt.value = remainingDays(link.expiresAt); }
    el.dialog.showModal(); setTimeout(() => el.url.focus(), 0);
  }
  function closeDialog() { el.dialog.close(); }
  function apiUrl() { return `${origin()}/api/v1/links`; }
  function apiExample() { return `curl -X POST ${apiUrl()} \\\n+  -H "Authorization: Bearer YOUR_API_KEY" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{"url":"https://example.com","code":"my-link","title":"示例","expiresAt":3}'`; }
  function renderApiKeys() {
    const keys = state.apiKeys;
    el.apiKeysSummary.textContent = t("apiKeyCount", { count: keys.length });
    el.apiKeysList.innerHTML = keys.length ? keys.map((key) => {
      const status = key.revokedAt ? `<span class="api-key-status revoked">${t("apiKeyRevoked")}</span>` : `<button class="row-action delete" type="button" data-revoke-api-key="${escapeHtml(key.id)}">${t("revoke")}</button>`;
      const usage = key.lastUsedAt ? t("apiKeyLastUsed", { date: formatDateTime(key.lastUsedAt) }) : t("apiKeyNeverUsed");
      return `<div class="api-key-row"><div><strong>${escapeHtml(key.name)}</strong><code>${escapeHtml(key.prefix)}••••••••••••</code><span>${usage}</span></div>${status}</div>`;
    }).join("") : `<p class="api-key-empty">${t("apiKeyNone")}</p>`;
  }
  async function loadApiKeys() {
    const data = await request("/api/api-keys");
    state.apiKeys = data.keys || [];
    renderApiKeys();
  }
  async function openApiDialog() {
    el.apiKeyForm.reset(); el.apiKeyResult.hidden = true; el.apiKeyValue.value = "";
    el.apiBaseUrl.textContent = apiUrl(); el.apiExample.textContent = apiExample();
    el.apiDialog.showModal();
    try { await loadApiKeys(); } catch (error) { showToast(error.message); }
  }
  async function revokeApiKey(id) {
    const key = state.apiKeys.find((item) => item.id === id);
    if (!key || !window.confirm(t("revokeApiKeyConfirm", { name: key.name }))) return;
    try { await request(`/api/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadApiKeys(); showToast(t("apiKeyRevokedToast")); } catch (error) { showToast(error.message); }
  }
  async function copy(code) { try { await navigator.clipboard.writeText(shortUrl(code)); showToast(t("copied")); } catch { showToast(t("copyFailed")); } }
  async function renderQr(control) {
    const holder = control.querySelector(".qr-canvas");
    if (holder.dataset.ready === "true") return true;
    if (!window.QRCode) { showToast(t("qrCodeFailed")); return false; }
    try {
      new window.QRCode(holder, { text: shortUrl(control.querySelector("[data-qr]").dataset.qr), width: 176, height: 176, colorDark: "#0b1020", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
      holder.dataset.ready = "true";
      return true;
    } catch { showToast(t("qrCodeFailed")); return false; }
  }
  async function showQr(control) {
    const popover = control.querySelector(".qr-popover");
    popover.hidden = false;
    await renderQr(control);
  }
  async function toggleQr(button) {
    const control = button.closest(".qr-control");
    const popover = control.querySelector(".qr-popover");
    const opening = popover.hidden || control.dataset.pinned !== "true";
    document.querySelectorAll(".qr-popover").forEach((item) => { if (item !== popover) item.hidden = true; });
    document.querySelectorAll(".qr-control").forEach((item) => { if (item !== control) delete item.dataset.pinned; });
    popover.hidden = !opening;
    if (opening) { control.dataset.pinned = "true"; await renderQr(control); } else delete control.dataset.pinned;
  }
  async function downloadQr(button) {
    const control = button.closest(".qr-control");
    if (!await renderQr(control)) return;
    const link = document.createElement("a");
    const canvas = control.querySelector(".qr-canvas canvas");
    if (!canvas) { showToast(t("qrCodeFailed")); return; }
    link.href = canvas.toDataURL("image/png");
    link.download = `short-link-${button.dataset.downloadQr}.png`;
    link.click();
  }
  async function deleteLink(code) {
    const link = state.links.find((item) => item.code === code);
    if (!link || !window.confirm(t("deleteConfirm", { code }))) return;
    try { await request(`/api/links/${encodeURIComponent(code)}`, { method: "DELETE" }); showToast(t("deleted")); loadLinks(); } catch (error) { showToast(error.message); }
  }
  el.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); el.loginError.textContent = ""; const button = el.loginForm.querySelector("button[type=submit]"); button.disabled = true;
    try {
      await request("/api/auth/login", { method: "POST", body: JSON.stringify({ password: el.password.value }) });
      el.password.value = "";
      sessionStorage.setItem("edgeshort:pending-login", "1");
      const session = await request("/api/auth/session");
      if (!session.authenticated) throw new Error(t("sessionMissing"));
      // This is a single-page admin. Keeping the successful session in the same
      // document avoids an unnecessary second authentication check during navigation.
      window.history.replaceState(null, "", "/admin/?view=links");
      showDashboard();
    }
    catch (error) { el.loginError.textContent = error.message; } finally { button.disabled = false; }
  });
  $("#toggle-password").addEventListener("click", () => { const hidden = el.password.type === "password"; el.password.type = hidden ? "text" : "password"; $("#toggle-password").textContent = hidden ? t("hide") : t("show"); });
  el.signOut.addEventListener("click", async () => { try { await request("/api/auth/logout", { method: "POST" }); } finally { showLogin(); } });
  $("#new-link").addEventListener("click", () => openDialog()); document.querySelector("[data-new-link]").addEventListener("click", () => openDialog());
  el.apiSettings.addEventListener("click", openApiDialog);
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", closeDialog));
  document.querySelectorAll("[data-close-api-dialog]").forEach((button) => button.addEventListener("click", () => el.apiDialog.close()));
  el.clearExpiry.addEventListener("click", () => { state.expiryDirty = true; el.expiresAt.value = ""; });
  el.expiresAt.addEventListener("input", () => { state.expiryDirty = true; });
  el.linkForm.addEventListener("submit", async (event) => {
    event.preventDefault(); el.linkError.textContent = ""; el.save.disabled = true;
    const expiryDays = el.expiresAt.value.trim();
    const expiresAt = state.editing && !state.expiryDirty ? (state.editing.expiresAt || "") : (expiryDays ? Number(expiryDays) : "");
    const body = { url: el.url.value, title: el.title.value, code: el.code.value.trim(), expiresAt };
    const path = state.editing ? `/api/links/${encodeURIComponent(state.editing.code)}` : "/api/links";
    try { const data = await request(path, { method: state.editing ? "PATCH" : "POST", body: JSON.stringify(body) }); closeDialog(); showToast(state.editing ? t("updatedToast") : t("created")); loadLinks(); if (!state.editing) copy(data.link.code); }
    catch (error) { el.linkError.textContent = error.message; } finally { el.save.disabled = false; }
  });
  el.apiKeyForm.addEventListener("submit", async (event) => {
    event.preventDefault(); el.generateApiKey.disabled = true;
    try {
      const data = await request("/api/api-keys", { method: "POST", body: JSON.stringify({ name: el.apiKeyName.value }) });
      el.apiKeyValue.value = data.key.value; el.apiKeyResult.hidden = false; el.apiKeyName.value = ""; await loadApiKeys();
    } catch (error) { showToast(error.message); } finally { el.generateApiKey.disabled = false; }
  });
  el.copyApiKey.addEventListener("click", async () => { try { await navigator.clipboard.writeText(el.apiKeyValue.value); showToast(t("apiKeyCopied")); } catch { showToast(t("copyFailed")); } });
  el.apiKeysList.addEventListener("click", (event) => { const button = event.target.closest("button[data-revoke-api-key]"); if (button) revokeApiKey(button.dataset.revokeApiKey); });
  el.table.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; if (button.dataset.copy) copy(button.dataset.copy); if (button.dataset.edit) openDialog(state.links.find((link) => link.code === button.dataset.edit)); if (button.dataset.delete) deleteLink(button.dataset.delete); if (button.dataset.qr) toggleQr(button); if (button.dataset.downloadQr) downloadQr(button); });
  el.table.addEventListener("pointerover", (event) => { const button = event.target.closest("[data-qr]"); if (button && event.pointerType !== "touch") showQr(button.closest(".qr-control")); });
  el.table.addEventListener("pointerout", (event) => { const control = event.target.closest(".qr-control"); if (control && !control.contains(event.relatedTarget) && control.dataset.pinned !== "true") control.querySelector(".qr-popover").hidden = true; });
  el.table.addEventListener("focusin", (event) => { const button = event.target.closest("[data-qr]"); if (button) showQr(button.closest(".qr-control")); });
  el.search.addEventListener("input", () => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(loadLinks, 200); });
  el.languageToggle.addEventListener("click", () => { state.language = state.language === "zh" ? "en" : "zh"; localStorage.setItem("edgeshort:language", state.language); applyLanguage(); });
  document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el.search.focus(); } });
  (async () => {
    const pendingLogin = sessionStorage.getItem("edgeshort:pending-login") === "1";
    try {
      const data = await request("/api/auth/session");
      if (data.authenticated) return showDashboard();
      showLogin(pendingLogin ? t("sessionMissing") : "");
    } catch {
      showLogin(pendingLogin ? t("sessionUnknown") : "");
    }
  })();
  applyLanguage();
})();
