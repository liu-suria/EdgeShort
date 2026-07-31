(() => {
  const state = { links: [], editing: null, searchTimer: null };
  const $ = (selector) => document.querySelector(selector);
  const el = {
    loginView: $("#login-view"), dashboard: $("#dashboard"), loginForm: $("#login-form"), password: $("#password"), loginError: $("#login-error"), signOut: $("#sign-out"),
    totalLinks: $("#total-links"), totalVisits: $("#total-visits"), linksSummary: $("#links-summary"), search: $("#search"), loading: $("#loading-state"), empty: $("#empty-state"), tableWrap: $("#table-wrap"), table: $("#links-table"),
    dialog: $("#link-dialog"), linkForm: $("#link-form"), dialogTitle: $("#dialog-title"), dialogEyebrow: $("#dialog-eyebrow"), editingCode: $("#editing-code"), url: $("#link-url"), title: $("#link-title"), code: $("#link-code"), codeWrap: $("#code-wrap"), codePrefix: $("#code-prefix"), linkError: $("#link-error"), save: $("#save-link"), toast: $("#toast"),
  };

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
  function origin() { return window.location.origin; }
  function shortUrl(code) { return `${origin()}/${code}`; }
  function formatNumber(value) { return new Intl.NumberFormat().format(Number(value) || 0); }
  function formatDate(value) { try { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); } catch { return "—"; } }
  function showToast(message) { el.toast.textContent = message; el.toast.classList.add("show"); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2600); }
  async function request(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }, ...options });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || "Something went wrong"); error.status = response.status; throw error; }
    return data;
  }
  function setLoading(loading) { el.loading.hidden = !loading; if (loading) { el.empty.hidden = true; el.tableWrap.hidden = true; } }
  function renderLinks() {
    const links = state.links;
    el.totalLinks.textContent = formatNumber(links.length);
    el.totalVisits.textContent = formatNumber(links.reduce((sum, link) => sum + (Number(link.visits) || 0), 0));
    el.linksSummary.textContent = links.length === 1 ? "1 link" : `${formatNumber(links.length)} links`;
    el.empty.hidden = links.length !== 0;
    el.tableWrap.hidden = links.length === 0;
    el.table.innerHTML = links.map((link) => {
      const short = shortUrl(link.code);
      const label = link.title ? `<span class="link-label">${escapeHtml(link.title)}</span>` : "";
      return `<tr><td class="link-cell"><a class="short-url" target="_blank" rel="noopener noreferrer" href="${escapeHtml(short)}">/${escapeHtml(link.code)}</a>${label}</td><td><a class="destination" target="_blank" rel="noopener noreferrer" href="${escapeHtml(link.url)}">${escapeHtml(link.url)}</a></td><td class="number">${formatNumber(link.visits)}</td><td><span class="date">${formatDate(link.updatedAt)}</span></td><td><div class="row-actions"><button class="row-action" type="button" data-copy="${escapeHtml(link.code)}">Copy</button><button class="row-action" type="button" data-edit="${escapeHtml(link.code)}">Edit</button><button class="row-action delete" type="button" data-delete="${escapeHtml(link.code)}">Delete</button></div></td></tr>`;
    }).join("");
  }
  async function loadLinks() {
    setLoading(true);
    try { const query = el.search.value.trim(); const data = await request(`/api/links${query ? `?q=${encodeURIComponent(query)}` : ""}`); state.links = data.links || []; renderLinks(); }
    catch (error) { if (error.status === 401) return showLogin(); showToast(error.message); state.links = []; renderLinks(); }
    finally { setLoading(false); }
  }
  function showLogin() { el.dashboard.hidden = true; el.signOut.hidden = true; el.loginView.hidden = false; setTimeout(() => el.password.focus(), 0); }
  function showDashboard() { el.loginView.hidden = true; el.dashboard.hidden = false; el.signOut.hidden = false; loadLinks(); }
  function openDialog(link = null) {
    state.editing = link;
    el.linkForm.reset(); el.linkError.textContent = ""; el.editingCode.value = link?.code || "";
    el.dialogEyebrow.textContent = link ? "EDIT LINK" : "NEW LINK"; el.dialogTitle.textContent = link ? "Edit short link" : "Create short link"; el.save.textContent = link ? "Save changes" : "Create link";
    el.codeWrap.hidden = Boolean(link); el.codePrefix.textContent = `${origin()}/`;
    if (link) { el.url.value = link.url; el.title.value = link.title || ""; }
    el.dialog.showModal(); setTimeout(() => el.url.focus(), 0);
  }
  function closeDialog() { el.dialog.close(); }
  async function copy(code) { try { await navigator.clipboard.writeText(shortUrl(code)); showToast("Short link copied"); } catch { showToast("Copy failed — please copy the link manually"); } }
  async function deleteLink(code) {
    const link = state.links.find((item) => item.code === code);
    if (!link || !window.confirm(`Delete /${code}? This cannot be undone.`)) return;
    try { await request(`/api/links/${encodeURIComponent(code)}`, { method: "DELETE" }); showToast("Link deleted"); loadLinks(); } catch (error) { showToast(error.message); }
  }
  el.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); el.loginError.textContent = ""; const button = el.loginForm.querySelector("button[type=submit]"); button.disabled = true;
    try { await request("/api/auth/login", { method: "POST", body: JSON.stringify({ password: el.password.value }) }); el.password.value = ""; showDashboard(); }
    catch (error) { el.loginError.textContent = error.message; } finally { button.disabled = false; }
  });
  $("#toggle-password").addEventListener("click", () => { const hidden = el.password.type === "password"; el.password.type = hidden ? "text" : "password"; $("#toggle-password").textContent = hidden ? "Hide" : "Show"; });
  el.signOut.addEventListener("click", async () => { try { await request("/api/auth/logout", { method: "POST" }); } finally { showLogin(); } });
  $("#new-link").addEventListener("click", () => openDialog()); document.querySelector("[data-new-link]").addEventListener("click", () => openDialog());
  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", closeDialog));
  el.linkForm.addEventListener("submit", async (event) => {
    event.preventDefault(); el.linkError.textContent = ""; el.save.disabled = true;
    const body = { url: el.url.value, title: el.title.value };
    if (!state.editing && el.code.value.trim()) body.code = el.code.value.trim();
    const path = state.editing ? `/api/links/${encodeURIComponent(state.editing.code)}` : "/api/links";
    try { const data = await request(path, { method: state.editing ? "PATCH" : "POST", body: JSON.stringify(body) }); closeDialog(); showToast(state.editing ? "Link updated" : "Link created"); loadLinks(); if (!state.editing) copy(data.link.code); }
    catch (error) { el.linkError.textContent = error.message; } finally { el.save.disabled = false; }
  });
  el.table.addEventListener("click", (event) => { const button = event.target.closest("button"); if (!button) return; if (button.dataset.copy) copy(button.dataset.copy); if (button.dataset.edit) openDialog(state.links.find((link) => link.code === button.dataset.edit)); if (button.dataset.delete) deleteLink(button.dataset.delete); });
  el.search.addEventListener("input", () => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(loadLinks, 200); });
  document.addEventListener("keydown", (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); el.search.focus(); } });
  (async () => { try { const data = await request("/api/auth/session"); data.authenticated ? showDashboard() : showLogin(); } catch { showLogin(); } })();
})();
