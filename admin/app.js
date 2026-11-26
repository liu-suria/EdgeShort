(() => {
  const translations = {
    zh: {
      pageLinks: "本页链接", pageVisits: "本页访问", prevPage: "上一页", nextPage: "下一页", pageNumber: "第 {n} 页",
      firstSetup: "首次配置", setupHint: "创建站点管理员，用于管理短链、用户和域名。", confirmPassword: "确认密码", setupCode: "首次设置码", proofHelp: "在 Makers 控制台的私有 Blob 中打开 edgeshort-links → setup，复制文件名（去掉 .json）。", createAdmin: "创建管理员", mismatch: "两次输入的密码不一致",
      brandAddress: "品牌", platformAddress: "平台", groupEntry: "组入口", domainName: "主域名", primaryDomain: "配置主域名", applyDomain: "保存并启用", unbindDomain: "解绑", rejectDomain: "驳回", approveDomain: "确认启用", pendingDomain: "待确认", activeDomain: "当前入口", reviewDomain: "管理员核实域名归属、CNAME 和 HTTPS 后启用。", localDomain: "本地演示：使用测试域名模拟接入，不查询 DNS 或签发证书。", confirmDomain: "确认对 {host} 执行「{action}」？",
      users: "用户管理", username: "账号", selectAccount: "选择账号", createUser: "＋ 新建账号", initialPassword: "初始密码", allowedGroups: "可管理的分组", enabled: "启用账号", disabled: "已停用", noGrants: "当前账号尚未获授权分组",
      linkList: "短链接",
      entryExpiry: "入口有效期", groupExpiryHelp: "从保存时开始计算。留空表示永久，仅影响组入口。", group: "分组", newGroup: "新建分组", groupName: "分组路径", allGroups: "全部", rootLinks: "根路径", copyGroup: "复制组入口", setDefault: "设为组默认", clearDefault: "清空默认", defaultMember: "组默认", defaultDelay: "切换后最多 60 秒生效", noDefault: "尚未设置默认链接", upgrade: "将此根短链升级为组入口", confirmUpgrade: "将 /{name} 升级为分组？当前目标和历史访问量将保存在 /{name}/home。", confirmClear: "清空 /{group} 的默认链接？组入口将返回 404，成员链接仍可访问。",
      adminConsole: "链接管理", privateAdmin: "私有管理后台", welcomeBack: "欢迎回来", signInDescription: "登录后管理你的短链接。", password: "密码", show: "显示", hide: "隐藏", signIn: "登录", signOut: "退出登录",
      yourLinks: "你的短链接", shortLinksTitle: "所有短链接，尽在一处。", shortLinksDescription: "创建、管理和追踪每一条链接。", storageReady: "存储已就绪", newLink: "新建链接", totalLinks: "链接总数", totalVisits: "访问总数", allLinks: "全部链接", loading: "加载中…", loadingLinks: "正在加载链接", searchLinks: "搜索链接", noLinks: "还没有链接", noLinksDescription: "新建第一条短链接，它会显示在这里。", noMatches: "没有匹配的链接", noMatchesDescription: "换个关键词试试。", remark: "备注", destination: "目标地址", visits: "访问", updated: "更新时间", actions: "操作",
      destinationUrl: "目标链接", label: "备注名称", optional: "可选", labelPlaceholder: "例如：夏日活动", customCode: "自定义短码", codeFormat: "1–16 位", codeHelp: "留空将自动生成安全短码。", editCodeHelp: "永久短链改址后，其他节点可能沿用原目标最多 24 小时。", expiresAt: "过期时间", expiresInDays: "有效天数", expiryDaysPlaceholder: "例如：3", days: "天", neverExpires: "永不过期", expiryHelp: "填写 3 表示保存后 3 天到期；留空表示永不过期。", expires: "过期：{date}", cancel: "取消", editLink: "编辑链接", createShortLink: "新建短链接", editShortLink: "编辑短链接", saveChanges: "保存修改", copy: "复制", edit: "编辑", delete: "删除", copied: "短链接已复制", copyFailed: "复制失败，请手动复制链接", deleteConfirm: "确定删除 /{code} 吗？此操作无法撤销。", deleted: "链接已删除", updatedToast: "链接已更新", created: "链接已创建", linkCount: "{count} 条链接", oneLink: "1 条链接",
      apiAccess: "API 调用", apiTitle: "API 密钥", apiDescription: "使用 API 在自己的工具或自动化中管理短链接。", apiKeyName: "密钥名称", apiKeyNamePlaceholder: "例如：自动化脚本", generateApiKey: "生成 API Key", apiKeyCreated: "请立即保存此 API Key", apiKeyOnce: "为了安全起见，关闭后将无法再次查看完整密钥。", activeApiKeys: "API Keys", apiKeyCount: "{count} 个密钥", apiKeyNone: "还没有 API Key。生成一个用于 API 调用。", apiKeyLastUsed: "最近使用：{date}", apiKeyNeverUsed: "尚未使用", apiKeyRevoked: "已撤销", revoke: "撤销", revokeApiKeyConfirm: "撤销「{name}」？使用此密钥的 API 调用将立即失效。", apiKeyRevokedToast: "API Key 已撤销", apiKeyCopied: "API Key 已复制", apiExample: "调用示例", qrCode: "短链二维码", saveQrCode: "保存二维码", qrCodeFailed: "二维码生成失败，请刷新后重试",
      sessionMissing: "密码验证成功，但浏览器没有保存登录状态。请允许此网站使用 Cookie 后重试。", sessionUnknown: "无法确认登录状态，请刷新页面后重试。", invalidUrl: "请输入有效的 http:// 或 https:// 目标链接", serverError: "服务器错误（{status}）。请检查最新的 Edge Function 部署和项目密钥。", requestFailed: "请求失败（{status}）",
    },
    en: {
      pageLinks: "Links on page", pageVisits: "Visits on page", prevPage: "Previous", nextPage: "Next", pageNumber: "Page {n}",
      firstSetup: "Initial setup", setupHint: "Create the site administrator to manage links, users and domains.", confirmPassword: "Confirm password", setupCode: "Setup code", proofHelp: "In the private Makers Blob store edgeshort-links, open setup and copy the file name without .json.", createAdmin: "Create administrator", mismatch: "The passwords do not match",
      brandAddress: "Brand", platformAddress: "Platform", groupEntry: "Group entry", domainName: "Primary domain", primaryDomain: "Configure domain", applyDomain: "Save and activate", unbindDomain: "Unbind", rejectDomain: "Reject", approveDomain: "Activate", pendingDomain: "Pending review", activeDomain: "Current entry", reviewDomain: "An admin activates the domain after verifying ownership, CNAME and HTTPS.", localDomain: "Local preview simulates domain setup without DNS or certificate issuance.", confirmDomain: "Confirm {action} for {host}?",
      users: "Users", username: "Username", selectAccount: "Select account", createUser: "+ New account", initialPassword: "Initial password", allowedGroups: "Assigned groups", enabled: "Account enabled", disabled: "Disabled", noGrants: "No groups assigned to this account",
      linkList: "Short links",
      entryExpiry: "Entry expiry", groupExpiryHelp: "Days from saving. Leave empty for no expiry. Only the group entry is affected.", group: "Group", newGroup: "New group", groupName: "Group path", allGroups: "All", rootLinks: "Root links", copyGroup: "Copy group URL", setDefault: "Set group default", clearDefault: "Clear default", defaultMember: "Group default", defaultDelay: "Changes propagate within 60 seconds", noDefault: "No default link", upgrade: "Upgrade root link to group", confirmUpgrade: "Upgrade /{name} to a group? Its destination and visits will be kept at /{name}/home.", confirmClear: "Clear the default of /{group}? The group entry will return 404. Member links will still work.",
      adminConsole: "LINK MANAGEMENT", privateAdmin: "PRIVATE ADMIN", welcomeBack: "Welcome back.", signInDescription: "Sign in to manage your short links.", password: "Password", show: "Show", hide: "Hide", signIn: "Sign in", signOut: "Sign out",
      yourLinks: "YOUR LINKS", shortLinksTitle: "Short links, in one place.", shortLinksDescription: "Create, manage, and track every link.", storageReady: "Storage ready", newLink: "New link", totalLinks: "Total links", totalVisits: "Total visits", allLinks: "All links", loading: "Loading…", loadingLinks: "Loading links", searchLinks: "Search links", noLinks: "No links yet", noLinksDescription: "Create your first short link to see it here.", noMatches: "No matching links", noMatchesDescription: "Try a different keyword.", remark: "Remark", destination: "Destination", visits: "Visits", updated: "Updated", actions: "Actions",
      destinationUrl: "Destination URL", label: "Remark", optional: "optional", labelPlaceholder: "e.g. Summer campaign", customCode: "Custom code", codeFormat: "1–16 characters", codeHelp: "Leave empty to generate a secure short code.", editCodeHelp: "Other nodes may retain an edited permanent destination for up to 24 hours.", expiresAt: "Expiration", expiresInDays: "Valid for", expiryDaysPlaceholder: "e.g. 3", days: "days", neverExpires: "Never expires", expiryHelp: "Enter 3 to expire the link three days after saving. Leave blank to never expire.", expires: "Expires: {date}", cancel: "Cancel", editLink: "EDIT LINK", createShortLink: "Create short link", editShortLink: "Edit short link", saveChanges: "Save changes", copy: "Copy", edit: "Edit", delete: "Delete", copied: "Short link copied", copyFailed: "Copy failed — please copy the link manually", deleteConfirm: "Delete /{code}? This cannot be undone.", deleted: "Link deleted", updatedToast: "Link updated", created: "Link created", linkCount: "{count} links", oneLink: "1 link",
      apiAccess: "API access", apiTitle: "API keys", apiDescription: "Use the API to manage short links from your own tools or automations.", apiKeyName: "Key name", apiKeyNamePlaceholder: "e.g. Automation script", generateApiKey: "Generate API key", apiKeyCreated: "Save this API key now", apiKeyOnce: "For security, the full key cannot be viewed again after this dialog is closed.", activeApiKeys: "API keys", apiKeyCount: "{count} keys", apiKeyNone: "No API keys yet. Generate one for API access.", apiKeyLastUsed: "Last used: {date}", apiKeyNeverUsed: "Never used", apiKeyRevoked: "Revoked", revoke: "Revoke", revokeApiKeyConfirm: "Revoke “{name}”? API calls using this key will stop immediately.", apiKeyRevokedToast: "API key revoked", apiKeyCopied: "API key copied", apiExample: "Example", qrCode: "Short-link QR code", saveQrCode: "Save QR code", qrCodeFailed: "Unable to generate the QR code. Refresh and try again.",
      sessionMissing: "Password accepted, but the browser did not save the session. Allow cookies for this site and try again.", sessionUnknown: "Unable to confirm the sign-in session. Refresh the page and try again.", invalidUrl: "Enter a valid http:// or https:// destination URL", serverError: "Server error ({status}). Check the latest Edge Function deployment and project secrets.", requestFailed: "Request failed ({status})",
    },
  };
  const savedLanguage = localStorage.getItem("edgeshort:language");
  const state = { user: null, accounts: [], links: [], groups: [], groupFilter: "*", apiKeys: [], editing: null, expiryDirty: false, searchTimer: null, language: savedLanguage === "en" ? "en" : "zh" };
  const $ = (selector) => document.querySelector(selector);
  const el = {
    loginView: $("#login-view"), dashboard: $("#dashboard"), loginForm: $("#login-form"), password: $("#password"), loginError: $("#login-error"), signOut: $("#sign-out"),
    totalLinks: $("#total-links"), totalVisits: $("#total-visits"), linksSummary: $("#links-summary"), search: $("#search"), loading: $("#loading-state"), empty: $("#empty-state"), noMatch: $("#no-match"), tableWrap: $("#table-wrap"), table: $("#links-table"),
    dialog: $("#link-dialog"), linkForm: $("#link-form"), dialogTitle: $("#dialog-title"), dialogEyebrow: $("#dialog-eyebrow"), editingCode: $("#editing-code"), url: $("#link-url"), title: $("#link-title"), code: $("#link-code"), codeOptional: $("#code-optional"), codeHelp: $("#code-help"), codePrefix: $("#code-prefix"), expiresAt: $("#link-expires-at"), clearExpiry: $("#clear-expiry"), linkError: $("#link-error"), save: $("#save-link"), toast: $("#toast"), languageToggle: $("#language-toggle"),
    apiSettings: $("#api-settings"), apiDialog: $("#api-dialog"), apiBaseUrl: $("#api-base-url"), apiExample: $("#api-example"), apiKeyForm: $("#api-key-form"), apiKeyName: $("#api-key-name"), generateApiKey: $("#generate-api-key"), apiKeyResult: $("#api-key-result"), apiKeyValue: $("#api-key-value"), copyApiKey: $("#copy-api-key"), apiKeysSummary: $("#api-keys-summary"), apiKeysList: $("#api-key-list"),
  };

  function t(key, values = {}) { return (translations[state.language][key] || key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? ""); }
  function applyLanguage() {
    document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
    document.title = state.language === "zh" ? "柿柿短链 — 管理后台" : "柿柿短链 — Admin";
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => { node.placeholder = t(node.dataset.i18nPlaceholder); });
    el.languageToggle.textContent = state.language === "zh" ? "EN" : "中文";
    el.languageToggle.setAttribute("aria-label", state.language === "zh" ? "Switch to English" : "切换至中文");
    if (el.dialog.open) el.codeHelp.textContent = state.editing ? t("editCodeHelp") : t("codeHelp");
    if (el.apiDialog.open) renderApiKeys();
    renderGroups();
    renderLinks();
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
    const activeUser = state.user;
    const response = await fetch(path, { credentials: "include", cache: "no-store", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }, ...options });
    const text = response.status === 204 ? "" : await response.text();
    if (activeUser && activeUser !== state.user) throw new Error(t("sessionUnknown"));
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      const fallback = response.status >= 500
        ? t("serverError", { status: response.status })
        : t("requestFailed", { status: response.status });
      const error = new Error(data?.error || fallback);
      error.status = response.status;
      if (state.user && [401, 403].includes(response.status) && path !== "/api/auth/session") refreshIdentity();
      throw error;
    }
    return data;
  }
  function setLoading(loading) { el.loading.hidden = !loading; if (loading) { el.empty.hidden = true; el.noMatch.hidden = true; el.tableWrap.hidden = true; } }
  let pageHistory = [""], nextCursor = null, listRequest = 0;
  function resetPages() { pageHistory = [""]; nextCursor = null; }
  function addressRows(resource, path) {
    const platform = resource.platformUrl || shortUrl(path);
    const brand = resource.brandUrl ?? (resource.shortUrl !== platform ? resource.shortUrl : null);
    const urls = [["brand", brand], ["platform", platform]];
    return urls.filter(([, value]) => value).map(([kind, value]) => {
      const href = escapeHtml(value);
      const label = t(kind === "brand" ? "brandAddress" : "platformAddress");
      const display = escapeHtml(value.replace(/^https?:\/\//, ""));
      const filename = escapeHtml(kind + "-" + path.replaceAll("/", "-"));
      return `<div class="address-row" data-kind="${kind}">
        <span class="address-label">${label}</span>
        <a class="short-url" target="_blank" rel="noopener noreferrer" href="${href}" title="${href}">${display}</a>
        <button class="row-action" type="button" data-copy="${href}" aria-label="${t("copy")} · ${label}">${t("copy")}</button>
        <div class="qr-control"><button class="qr-trigger" type="button" data-qr="${href}" aria-label="${t("qrCode")} · ${label}" title="${t("qrCode")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4V4Zm2 2v2h2V6H6Zm8-2h6v6h-6V4Zm2 2v2h2V6h-2ZM4 14h6v6H4v-6Zm2 2v2h2v-2H6Zm7-2h2v2h-2v-2Zm3 0h4v2h-2v2h2v2h-4v-2h-2v-2h2v-2Zm-3 4h2v2h-2v-2Z"/></svg></button>
          <div class="qr-popover" role="group" aria-label="${t("qrCode")}" hidden><div class="qr-canvas"></div>
            <span class="qr-caption">${label} · ${t("qrCode")}</span><button class="qr-download" type="button" data-download-qr="${filename}">${t("saveQrCode")}</button></div>
        </div></div>`;
    }).join("");
  }
  function renderLinks() {
    const all = state.links;
    const links = all;
    $("#list-pager").hidden = pageHistory.length === 1 && !nextCursor;
    $("#prev-page").disabled = pageHistory.length === 1;
    $("#next-page").disabled = !nextCursor;
    $("#page-index").textContent = t("pageNumber", { n: pageHistory.length });
    el.totalLinks.textContent = formatNumber(all.length);
    el.totalVisits.textContent = formatNumber(all.reduce((sum, link) => sum + (Number(link.visits) || 0), 0));
    el.linksSummary.textContent = links.length === 1 ? t("oneLink") : t("linkCount", { count: formatNumber(links.length) });
    const searching = Boolean(el.search.value.trim() || pageHistory.length > 1 || nextCursor);
    el.empty.hidden = links.length !== 0 || searching;
    el.noMatch.hidden = links.length !== 0 || !searching;
    el.tableWrap.hidden = links.length === 0;
    el.table.innerHTML = links.map((link) => {
      const group = state.groups.find(item => item.name === link.group);
      let defaultAction = "";
      if (group?.defaultCode === link.code) defaultAction = `<span class="field-note">${t("defaultMember")}</span>`;
      else if (group && link.status === "active") defaultAction = `<button class="row-action" data-default="${escapeHtml(link.path)}">${t("setDefault")}</button>`;
      const remark = link.title ? `<span class="link-note" title="${escapeHtml(link.title)}">${escapeHtml(link.title)}</span>` : "";
      const expiry = link.expiresAt
        ? `<span class="expiry">${formatExpiryDate(link.expiresAt)}</span>`
        : `<span class="expiry expiry-never">${t("neverExpires")}</span>`;
      return `<tr><td class="code-cell">${addressRows(link, link.path)}${remark}</td><td class="destination-cell"><a class="destination" title="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a></td><td class="number" data-label="${t("visits")}">${formatNumber(link.visits)}</td><td class="expiry-cell" data-label="${t("expiresAt")}">${expiry}</td><td class="date-cell" data-label="${t("updated")}"><span class="date">${formatDate(link.updatedAt)}</span></td><td><div class="row-actions">${defaultAction}<button class="row-action" type="button" data-edit="${escapeHtml(link.path)}">${t("edit")}</button><button class="row-action delete" type="button" data-delete="${escapeHtml(link.path)}">${t("delete")}</button></div></td></tr>`;
    }).join("");
  }
  async function loadLinks() {
    const seq = ++listRequest;
    const query = new URLSearchParams({ limit: "20" });
    if (pageHistory.at(-1)) query.set("cursor", pageHistory.at(-1));
    if (state.groupFilter !== "*") query.set("group", state.groupFilter);
    if (el.search.value.trim()) query.set("q", el.search.value.trim());
    setLoading(true);
    const user = state.user;
    try {
      const data = await request("/api/links?" + query);
      if (state.user !== user || seq !== listRequest) return;
      nextCursor = data.nextCursor;
      state.links = data.links; state.groups = data.groups; renderGroups(); renderLinks();
    } catch (error) {
      if (state.user !== user || seq !== listRequest) return;
      if (error.status === 401) return showLogin();
      showToast(error.message); state.links = []; state.groups = []; renderGroups(); renderLinks();
    } finally { if (state.user === user && seq === listRequest) setLoading(false); }
  }
  function clearPrivateView() {
    document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
    state.links = []; state.groups = []; state.apiKeys = []; state.accounts = [];
    listRequest++; resetPages(); state.editing = null; state.groupFilter = "*";
    el.apiKeyValue.value = ""; el.apiKeyResult.hidden = true; el.apiKeysList.replaceChildren();
    $("#managed-user").replaceChildren(); $("#account-groups").replaceChildren(); $("#users-form").reset();
    el.search.value = ""; el.linkForm.reset(); renderGroups(); renderLinks();
  }
  function showLogin(message = "") {
    $("#setup-view").hidden = true;
    state.user = null; clearPrivateView();
    $("#current-user").textContent = "";
    el.dashboard.hidden = true;
    el.signOut.hidden = true;
    el.loginView.hidden = false;
    if (message) el.loginError.textContent = message;
    setTimeout(() => el.password.focus(), 0);
  }
  function showDashboard(user) {
    $("#setup-view").hidden = true;
    state.user = user ?? { username: "admin", role: "admin" };
    clearPrivateView();
    $("#current-user").textContent = state.user.username;
    $("#users-button").hidden = user?.role !== "admin";
    $("#new-group").hidden = state.user.role !== "admin";
    sessionStorage.removeItem("edgeshort:pending-login");
    el.loginError.textContent = "";
    el.loginView.hidden = true;
    el.dashboard.hidden = false;
    el.signOut.hidden = false;
    loadLinks();
  }
  async function refreshIdentity() {
    const previous = state.user;
    if (!previous) return;
    try {
      const data = await request("/api/auth/session");
      if (state.user !== previous) return;
      if (!data.authenticated) return showLogin();
      if (data.user && (previous.username !== data.user.username || previous.revision !== data.user.revision)) showDashboard(data.user);
    } catch { /* The next management request is independently authorized. */ }
  }
  window.addEventListener("focus", refreshIdentity);
  window.setInterval(() => { if (!document.hidden && state.user?.role === "member") refreshIdentity(); }, 15000);
  function openDialog(link = null) {
    state.editing = link; state.expiryDirty = false;
    el.linkForm.reset(); el.linkError.textContent = ""; el.editingCode.value = link?.code || "";
    el.dialogEyebrow.textContent = link ? t("editLink") : t("newLink"); el.dialogTitle.textContent = link ? t("editShortLink") : t("createShortLink"); el.save.textContent = link ? t("saveChanges") : t("newLink");
    $("#link-group").value = link?.group ?? (state.groupFilter === "*" ? (state.user.role === "admin" ? "" : state.groups[0]?.name) : state.groupFilter); updatePrefix(); el.code.value = link?.code || ""; el.code.required = Boolean(link); el.codeOptional.hidden = Boolean(link); el.codeHelp.textContent = link ? t("editCodeHelp") : t("codeHelp");
    if (link) { el.url.value = link.url; el.title.value = link.title || ""; el.expiresAt.value = remainingDays(link.expiresAt); }
    el.dialog.showModal(); setTimeout(() => el.url.focus(), 0);
  }
  function closeDialog() { el.dialog.close(); }
  function apiUrl() { return `${origin()}/api/v1/links`; }
  function apiExample() {
    const admin = state.user?.role === "admin";
    const group = state.groups.find(item => item.name === state.groupFilter)?.name || state.groups[0]?.name;
    const lines = ["Authorization: Bearer YOUR_API_KEY", "GET   /api/v1/groups"];
    if (admin) lines.push('POST  /api/v1/groups  {"name":"campaign"}');
    if (group) {
      lines.push(
        `POST  /api/v1/links  ${JSON.stringify({ group, code: "sale", url: "https://example.com/sale", expiresAt: 7 })}`,
        `PATCH /api/v1/groups/${group}  {"defaultCode":"sale"}`,
        `PATCH /api/v1/links/${group}/sale  {"expiresAt":null}`,
        `GET   /api/v1/links?group=${group}`,
      );
    }
    return lines.join("\n");
  }
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
    el.apiBaseUrl.textContent = apiUrl();
    $("#mcp-endpoint").textContent = origin() + "/api/mcp";
    el.apiExample.textContent = apiExample();
    el.apiDialog.showModal();
    try { await loadApiKeys(); } catch (error) { showToast(error.message); }
  }
  async function revokeApiKey(id) {
    const key = state.apiKeys.find((item) => item.id === id);
    if (!key || !window.confirm(t("revokeApiKeyConfirm", { name: key.name }))) return;
    try { await request(`/api/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" }); await loadApiKeys(); showToast(t("apiKeyRevokedToast")); } catch (error) { showToast(error.message); }
  }
  async function copy(url) { try { await navigator.clipboard.writeText(url); showToast(t("copied")); } catch { showToast(t("copyFailed")); } }
  // The QR library is only needed once someone opens a code, so load it lazily.
  function loadQrLibrary() {
    if (window.QRCode) return Promise.resolve(true);
    loadQrLibrary.promise ||= new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/admin/qrcode.min.js?v=1";
      script.onload = () => resolve(Boolean(window.QRCode));
      script.onerror = () => { loadQrLibrary.promise = null; resolve(false); };
      document.head.append(script);
    });
    return loadQrLibrary.promise;
  }
  async function renderQr(control) {
    const holder = control.querySelector(".qr-canvas");
    if (holder.dataset.ready === "true") return true;
    if (!await loadQrLibrary()) { showToast(t("qrCodeFailed")); return false; }
    try {
      new window.QRCode(holder, { text: control.querySelector("[data-qr]").dataset.qr, width: 176, height: 176, colorDark: "#0b1020", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.M });
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
    const link = state.links.find((item) => item.path === code);
    if (!link || !window.confirm(t("deleteConfirm", { code }))) return;
    try { await request(`/api/links/${code.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" }); resetPages(); await loadLinks(); showToast(t("deleted")); } catch (error) { showToast(error.message); }
  }
  function renderGroups() {
    const options = state.groups.map(group => new Option(group.name, group.name));
    const selected = $("#link-group").value;
    const allowRoot = state.user?.role === "admin";
    const rootOption = () => allowRoot ? [new Option(t("rootLinks"), "")] : [];
    const tabs = [new Option(t("allGroups"), "*"), ...rootOption(), ...options];
    const noGrants = !allowRoot && options.length === 0;
    $("#new-link").disabled = noGrants;
    $("[data-new-link]").hidden = noGrants;
    el.empty.querySelector("p").textContent = t(noGrants ? "noGrants" : "noLinksDescription");
    if (!tabs.some(option => option.value === state.groupFilter)) state.groupFilter = "*";
    $("#group-tabs").replaceChildren(...tabs.map(option => {
      const tab = document.createElement("button");
      const active = option.value === state.groupFilter;
      tab.type = "button";
      tab.id = option.value === "*" ? "tab-all" : option.value ? "tab-group-" + option.value : "tab-root";
      tab.dataset.group = option.value;
      tab.textContent = option.text;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(active));
      tab.setAttribute("aria-controls", "group-panel");
      tab.tabIndex = active ? 0 : -1;
      if (active) $("#group-panel").setAttribute("aria-labelledby", tab.id);
      return tab;
    }));
    $("#link-group").replaceChildren(...rootOption(), ...options);
    $("#link-group").value = selected || "";
    const current = state.groups.find(group => group.name === state.groupFilter);
    $("#group-domain").hidden = !current || !allowRoot;
    $("#group-domain").textContent = current?.domain?.pending ? t("primaryDomain") + " · " + t("pendingDomain") : t("primaryDomain");
    $("#group-entry").hidden = !current;
    $("#group-addresses").innerHTML = current ? addressRows(current, current.name) : "";
    $("#group-expiry").hidden = !current;
    $("#clear-default").hidden = !current?.defaultCode;
    $("#default-summary").textContent = current ? (current.defaultCode ? t("defaultMember") + " · /" + current.name + "/" + current.defaultCode : t("noDefault")) : "";
    $("#default-summary").title = current ? t("defaultDelay") : "";
  }
  function updatePrefix() {
    const group = $("#link-group").value;
    el.codePrefix.textContent = state.groups.find(item => item.name === group)?.shortUrl.replace(/\/$/, "") || origin();
  }
  async function changeDefault(name, code) {
    try {
      const data = await request("/api/groups/" + name, { method: "PATCH", body: JSON.stringify({ defaultCode: code }) });
      state.groups = state.groups.map(group => group.name === name ? data.group : group);
      renderGroups(); renderLinks();
    } catch (error) { showToast(error.message); }
  }
  $("#group-expiry").addEventListener("click", () => {
    const group = state.groups.find(item => item.name === state.groupFilter);
    $("#current-group-expiry").textContent = "/" + group.name + " · " + (group.expiresAt ? formatDateTime(group.expiresAt) : t("neverExpires"));
    $("#group-days").value = remainingDays(group.expiresAt);
    $("#group-expiry-error").textContent = "";
    $("#expiry-dialog").showModal();
  });
  $("#cancel-expiry").addEventListener("click", () => $("#expiry-dialog").close());
  $("#group-expiry-form").addEventListener("submit", async event => {
    event.preventDefault();
    const name = state.groupFilter;
    const days = $("#group-days").value;
    try {
      const data = await request("/api/groups/" + name, { method: "PATCH", body: JSON.stringify({ expiresAt: days ? Number(days) : null }) });
      state.groups = state.groups.map(group => group.name === name ? data.group : group);
      $("#expiry-dialog").close(); renderGroups(); showToast(t("updatedToast"));
    } catch (error) { $("#group-expiry-error").textContent = error.message; }
  });
  $("#link-group").addEventListener("change", updatePrefix);
  function selectGroup(tab) {
    state.groupFilter = tab.dataset.group;
    resetPages(); renderGroups(); loadLinks();
    $("#group-tabs [aria-selected=true]").focus();
  }
  $("#group-tabs").addEventListener("click", event => {
    const tab = event.target.closest("[role=tab]");
    if (tab) selectGroup(tab);
  });
  $("#group-tabs").addEventListener("keydown", event => {
    const tabs = [...event.currentTarget.children];
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    const destinations = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0, End: tabs.length - 1,
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    selectGroup(tabs[destinations[event.key]]);
  });
  function renderDomain() {
    const group = state.groups.find(item => item.name === state.groupFilter);
    if (!group || state.user?.role !== "admin") return $("#domain-dialog").close();
    const active = group.domain?.active;
    const pending = group.domain?.pending;
    const admin = state.user?.role === "admin";
    $("#domain-name").value = active?.hostname || "";
    $("#domain-current").textContent = group.name + " · " + t("activeDomain") + " · " + group.shortUrl;
    $("#domain-pending").textContent = pending ? t("pendingDomain") + " · " + pending.hostname + " · " + pending.requestedBy : "";
    $("#domain-help").textContent = t(location.hostname === "127.0.0.1" ? "localDomain" : "reviewDomain");
    $("#domain-field").hidden = $("#domain-name").disabled = $("#apply-domain").hidden = Boolean(pending);
    $("#approve-domain").hidden = $("#reject-domain").hidden = !(admin && pending);
    $("#unbind-domain").hidden = !(admin && active);
  }
  $("#group-domain").addEventListener("click", async () => {
    if (state.user?.role !== "admin") return;
    await loadLinks();
    if (!state.groups.some(group => group.name === state.groupFilter)) return;
    $("#domain-form").reset(); $("#domain-error").textContent = ""; renderDomain(); $("#domain-dialog").showModal();
  });
  $("#close-domain").addEventListener("click", () => $("#domain-dialog").close());
  async function domainAction(action) {
    const group = state.groups.find(item => item.name === state.groupFilter);
    const selected = action === "unbind" ? group.domain?.active : group.domain?.pending;
    const body = { action };
    if (action === "configure") {
      body.hostname = $("#domain-name").value.trim();
      body.id = group.domain?.active?.id ?? null;
      if (!confirm(t("confirmDomain", { host: body.hostname, action: t("applyDomain") }))) return;
    }
    else {
      if (!selected || !confirm(t("confirmDomain", { host: selected.hostname, action: t({approve:"approveDomain", reject:"rejectDomain", unbind:"unbindDomain"}[action]) }))) return;
      body.id = selected.id;
    }
    try {
      await request("/api/groups/" + group.name + "/domain", { method: "POST", body: JSON.stringify(body) });
      $("#domain-error").textContent = ""; $("#domain-name").value = "";
      await loadLinks(); renderDomain();
    } catch (error) { $("#domain-error").textContent = error.message; }
  }
  $("#domain-form").addEventListener("submit", event => { event.preventDefault(); domainAction("configure"); });
  $("#approve-domain").addEventListener("click", () => domainAction("approve"));
  $("#reject-domain").addEventListener("click", () => domainAction("reject"));
  $("#unbind-domain").addEventListener("click", () => domainAction("unbind"));
  $("#clear-default").addEventListener("click", () => {
    if (confirm(t("confirmClear", { group: state.groupFilter }))) changeDefault(state.groupFilter, null);
  });
  $("#new-group").addEventListener("click", () => { $("#group-form").reset(); $("#group-error").textContent = ""; $("#group-preview").textContent = shortUrl("gome"); $("#group-dialog").showModal(); $("#group-name").focus(); });
  $("#cancel-group").addEventListener("click", () => $("#group-dialog").close());
  $("#group-name").addEventListener("input", event => { $("#group-preview").textContent = shortUrl(event.target.value); });
  $("#group-form").addEventListener("submit", async event => {
    event.preventDefault();
    const name = $("#group-name").value;
    let existing;
    try { existing = (await request("/api/links/" + encodeURIComponent(name))).link; }
    catch (error) { if (error.status !== 404) { $("#group-error").textContent = error.message; return; } }
    if (existing && !confirm(t("confirmUpgrade", { name }) + "\n" + existing.url)) return;
    try {
      await request("/api/groups", { method: "POST", body: JSON.stringify({ name, upgradeRoot: Boolean(existing) }) });
      state.groupFilter = name; resetPages(); $("#group-dialog").close(); await loadLinks();
    } catch (error) { $("#group-error").textContent = error.message; }
  });
  function renderAccountForm() {
    const name = $("#managed-user").value;
    const account = state.accounts.find(user => user.username === name);
    $("#account-create-fields").hidden = Boolean(account);
    $("#account-name").required = $("#account-password").required = !account;
    $("#account-name").disabled = $("#account-password").disabled = Boolean(account);
    $("#account-password").value = ""; $("#account-name").value = "";
    $("#account-status").hidden = !account;
    $("#account-enabled").checked = account?.enabled ?? true;
    $("#account-error").textContent = "";
    $("#account-groups").replaceChildren(...state.groups.map(group => {
      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox"; box.value = group.name; box.checked = account?.groups.includes(group.name) ?? false;
      label.append(box, group.name); return label;
    }));
  }
  async function loadAccounts(selected = "") {
    const data = await request("/api/users");
    state.accounts = data.users;
    $("#managed-user").replaceChildren(new Option(t("createUser"), ""), ...data.users.map(user =>
      new Option(user.username + (user.enabled ? "" : " · " + t("disabled")), user.username)));
    $("#managed-user").value = selected;
    renderAccountForm();
  }
  $("#users-button").addEventListener("click", async () => {
    try { await loadAccounts(); $("#users-dialog").showModal(); }
    catch (error) { showToast(error.message); }
  });
  $("#managed-user").addEventListener("change", renderAccountForm);
  $("#close-users").addEventListener("click", () => $("#users-dialog").close());
  $("#users-form").addEventListener("submit", async event => {
    event.preventDefault();
    const account = state.accounts.find(user => user.username === $("#managed-user").value);
    const groups = [...$("#account-groups").querySelectorAll("input:checked")].map(box => box.value);
    const body = account ? { groups, enabled: $("#account-enabled").checked, revision: account.revision }
      : { username: $("#account-name").value.trim(), password: $("#account-password").value, groups };
    $("#save-user").disabled = true;
    try {
      const data = await request(account ? "/api/users/" + account.username : "/api/users", {
        method: account ? "PATCH" : "POST", body: JSON.stringify(body),
      });
      await loadAccounts(data.user.username); showToast(t("updatedToast"));
    } catch (error) { $("#account-error").textContent = error.message; }
    finally { $("#save-user").disabled = false; }
  });
  function showSetup(needsProof) {
    showLogin();
    el.loginView.hidden = true;
    $("#setup-view").hidden = false;
    $("#setup-proof-field").hidden = !needsProof;
    $("#setup-proof").required = needsProof;
    $("#setup-name").focus();
  }
  $("#setup-form").addEventListener("submit", async event => {
    event.preventDefault();
    const username = $("#setup-name").value.trim();
    const password = $("#setup-password").value;
    const errorBox = $("#setup-error");
    if (password !== $("#setup-confirm").value) { errorBox.textContent = t("mismatch"); return; }
    const button = event.currentTarget.querySelector("button[type=submit]");
    button.disabled = true; errorBox.textContent = "";
    try {
      await request("/api/auth/setup", { method: "POST", body: JSON.stringify({ username, password, setupCode: $("#setup-proof").value.trim() }) });
      $("#setup-form").reset(); $("#username").value = username;
      const session = await request("/api/auth/session");
      if (session.authenticated) showDashboard(session.user);
      else showLogin(t("sessionMissing"));
    } catch (error) {
      if (error.status === 409 && !(await request("/api/auth/session")).needsSetup) showLogin(error.message);
      else errorBox.textContent = error.message;
    } finally { button.disabled = false; }
  });
  el.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); el.loginError.textContent = ""; const button = el.loginForm.querySelector("button[type=submit]"); button.disabled = true;
    try {
      await request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: $("#username").value.trim(), password: el.password.value }) });
      el.password.value = "";
      sessionStorage.setItem("edgeshort:pending-login", "1");
      const session = await request("/api/auth/session");
      if (!session.authenticated) throw new Error(t("sessionMissing"));
      // This is a single-page admin. Keeping the successful session in the same
      // document avoids an unnecessary second authentication check during navigation.
      window.history.replaceState(null, "", "/admin/?view=links");
      showDashboard(session.user);
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
    const body = { url: el.url.value, title: el.title.value, group: $("#link-group").value, code: el.code.value.trim(), expiresAt };
    if (state.editing && !state.expiryDirty) delete body.expiresAt;
    const path = state.editing ? `/api/links/${state.editing.path.split("/").map(encodeURIComponent).join("/")}` : "/api/links";
    try {
      const editing = state.editing;
      const data = await request(path, { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) });
      resetPages(); closeDialog(); await loadLinks(); showToast(editing ? t("updatedToast") : t("created"));
      if (!editing) copy(data.link.shortUrl);
    }
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
  $("#group-panel").addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; if (button.dataset.default) { const [name, code] = button.dataset.default.split("/"); changeDefault(name, code); } if (button.dataset.copy) copy(button.dataset.copy); if (button.dataset.edit) openDialog(state.links.find((link) => link.path === button.dataset.edit)); if (button.dataset.delete) deleteLink(button.dataset.delete); if (button.dataset.qr) toggleQr(button); if (button.dataset.downloadQr) downloadQr(button); });
  $("#group-panel").addEventListener("pointerover", (event) => { const button = event.target.closest("[data-qr]"); if (button && event.pointerType !== "touch") showQr(button.closest(".qr-control")); });
  $("#group-panel").addEventListener("pointerout", (event) => { const control = event.target.closest(".qr-control"); if (control && !control.contains(event.relatedTarget) && control.dataset.pinned !== "true") control.querySelector(".qr-popover").hidden = true; });
  $("#group-panel").addEventListener("focusin", (event) => { const button = event.target.closest("[data-qr]"); if (button) showQr(button.closest(".qr-control")); });
  el.search.addEventListener("input", () => {
    clearTimeout(state.searchTimer); listRequest++; resetPages();
    state.searchTimer = setTimeout(() => { if (state.user) loadLinks(); }, 160);
  });
  $("#next-page").addEventListener("click", () => {
    if (nextCursor) { pageHistory.push(nextCursor); nextCursor = null; loadLinks(); }
  });
  $("#prev-page").addEventListener("click", () => {
    if (pageHistory.length > 1) { pageHistory.pop(); nextCursor = null; loadLinks(); }
  });
  el.languageToggle.addEventListener("click", () => { state.language = state.language === "zh" ? "en" : "zh"; localStorage.setItem("edgeshort:language", state.language); applyLanguage(); });
  document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el.search.focus(); } });
  (async () => {
    const pendingLogin = sessionStorage.getItem("edgeshort:pending-login") === "1";
    try {
      const data = await request("/api/auth/session");
      if (data.needsSetup) return showSetup(data.needsProof);
      if (data.authenticated) return showDashboard(data.user);
      showLogin(pendingLogin ? t("sessionMissing") : "");
    } catch {
      showLogin(pendingLogin ? t("sessionUnknown") : "");
    }
  })();
  applyLanguage();
})();
