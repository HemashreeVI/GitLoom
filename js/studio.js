/* GitLoom Studio — every control edits one config object; the preview iframe re-renders from it. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = GL.esc;
  const frame = $("#preview");

  // ---------- State ----------
  function loadDraft() { try { return JSON.parse(localStorage.getItem("gl:draft") || "null"); } catch (e) { return null; } }
  let cfg = GLC.fromLocation() || GLC.sanitize(loadDraft()) || GLC.defaults();
  const q = new URLSearchParams(location.search);
  if (q.get("t")) cfg = GLC.sanitize({ ...cfg, t: q.get("t"), a: (GLC.TEMPLATES.find(t => t.id === q.get("t")) || {}).accent });
  if (q.get("user")) cfg.user = q.get("user").replace(/^@/, "");
  let repoData = null, ready = false;

  // Undo / redo
  const past = [], future = [];
  let lastSnap = JSON.stringify(cfg), groupTimer = null, grouping = false;
  function snapshot(group) {
    const now = JSON.stringify(cfg);
    if (now === lastSnap) return;
    if (!(group && grouping)) { past.push(lastSnap); if (past.length > 80) past.shift(); future.length = 0; }
    lastSnap = now;
    grouping = !!group;
    clearTimeout(groupTimer);
    if (group) groupTimer = setTimeout(() => (grouping = false), 700);
    histUI();
  }
  function histUI() { $("#undo").disabled = !past.length; $("#redo").disabled = !future.length; }
  function undo() { if (!past.length) return; future.push(JSON.stringify(cfg)); cfg = JSON.parse(past.pop()); lastSnap = JSON.stringify(cfg); grouping = false; afterExternalChange(); }
  function redo() { if (!future.length) return; past.push(JSON.stringify(cfg)); cfg = JSON.parse(future.pop()); lastSnap = JSON.stringify(cfg); grouping = false; afterExternalChange(); }

  let sendTimer = null;
  function commit({ group = false, immediate = false } = {}) {
    cfg = GLC.sanitize(cfg);
    snapshot(group);
    try { localStorage.setItem("gl:draft", JSON.stringify(cfg)); } catch (e) {}
    history.replaceState(null, "", location.pathname + "#c=" + GLC.encode(cfg));
    $("#open").href = "portfolio.html#c=" + GLC.encode(cfg);
    pagesInfo();
    clearTimeout(sendTimer);
    sendTimer = setTimeout(send, immediate ? 0 : 140);
  }
  function send() {
    if (!ready) return;
    $("#empty").hidden = !!cfg.user;
    if (cfg.user) frame.contentWindow.postMessage({ type: "gl:render", cfg }, "*");
  }
  function afterExternalChange() { cfg = GLC.sanitize(cfg); syncUI(); histUI(); commit({ immediate: true }); if (cfg.user && (!repoData || repoData.user.login.toLowerCase() !== cfg.user.toLowerCase())) loadUser(cfg.user); }

  // ---------- Messages from the preview ----------
  addEventListener("message", ev => {
    const m = ev.data || {};
    if (ev.source !== frame.contentWindow) return;
    if (m.type === "gl:status") {
      if (m.state === "booted") { ready = true; send(); }
      if (m.state === "error" && m.code !== "no_user") status(m.msg, "err");
    }
    if (m.type === "gl:exported" && m.html) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([m.html], { type: "text/html" }));
      a.download = "index.html";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast("Downloaded index.html");
    }
  });

  // ---------- Toast / status ----------
  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2200); }
  function status(msg, kind = "") { const s = $("#userStatus"); s.textContent = msg; s.className = "status " + kind; }

  // ---------- Tabs ----------
  $$(".tab").forEach(t => t.addEventListener("click", () => {
    $$(".tab").forEach(x => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    $$(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === t.dataset.tab));
    $(".panes").scrollTop = 0;
  }));

  // ---------- Device sizes ----------
  $$(".dev").forEach(b => b.addEventListener("click", () => {
    $$(".dev").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
    $("#frame").style.width = b.dataset.w;
    $("#frame").classList.toggle("device", b.dataset.w !== "100%");
  }));

  // ---------- Simple bound inputs ----------
  $$("[data-k]").forEach(el => {
    const k = el.dataset.k;
    const ev = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => {
      cfg[k] = el.type === "checkbox" ? el.checked : el.type === "range" ? +el.value : el.value;
      if (k === "max") $("#maxOut").textContent = el.value;
      commit({ group: ev === "input" });
    });
  });

  // ---------- Templates, colours, fonts ----------
  $("#tpls").innerHTML = GLC.TEMPLATES.map(t => `
    <button type="button" class="tpl" data-t="${t.id}" role="radio" aria-checked="false">
      <span class="mini" data-t="${t.id}" style="--ac:${t.accent}"><i></i><b></b><b></b><s></s><s></s><s></s></span>
      <strong>${esc(t.name)}</strong><small>${esc(t.note)}</small>
    </button>`).join("");
  $$(".tpl").forEach(b => b.addEventListener("click", () => {
    const prevTpl = GLC.TEMPLATES.find(t => t.id === cfg.t);
    const next = GLC.TEMPLATES.find(t => t.id === b.dataset.t);
    // Keep a custom colour; follow the template's colour if the user never changed it.
    if (!prevTpl || cfg.a.toLowerCase() === prevTpl.accent.toLowerCase()) cfg.a = next.accent;
    cfg.t = next.id;
    syncDesign(); commit({ immediate: true });
  }));

  const SWATCHES = ["#ff4d2e", "#e30613", "#d6336c", "#a78bfa", "#6d28d9", "#2f6fed", "#4de2f0", "#14b8a6", "#33ff8a", "#2a9d6f", "#5c7c5a", "#ffe500", "#ffd166", "#e0a800", "#111111"];
  $("#swatches").innerHTML = SWATCHES.map(c => `<button type="button" class="sw" data-c="${c}" style="--c:${c}" aria-label="Accent ${c}"></button>`).join("");
  $$(".sw").forEach(b => b.addEventListener("click", () => { cfg.a = b.dataset.c; syncDesign(); commit({ immediate: true }); }));
  $("#accent").addEventListener("input", e => { cfg.a = e.target.value; syncDesign(); commit({ group: true }); });
  $("#tplColor").addEventListener("click", () => { cfg.a = GLC.TEMPLATES.find(t => t.id === cfg.t).accent; syncDesign(); commit({ immediate: true }); });

  $("#fonts").innerHTML = GLC.FONTS.map(f => `<button type="button" class="font" data-f="${f.id}" role="radio" aria-checked="false" style="${f.css ? `font-family:${f.css}` : ""}"><span>Ag</span><small>${esc(f.name)}</small></button>`).join("");
  $$(".font").forEach(b => b.addEventListener("click", () => { cfg.font = b.dataset.f; syncDesign(); commit({ immediate: true }); }));

  function syncDesign() {
    $$(".tpl").forEach(b => { const on = b.dataset.t === cfg.t; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); b.querySelector(".mini").style.setProperty("--ac", on ? cfg.a : GLC.TEMPLATES.find(t => t.id === b.dataset.t).accent); });
    $$(".sw").forEach(b => b.classList.toggle("on", b.dataset.c.toLowerCase() === cfg.a.toLowerCase()));
    $("#accent").value = cfg.a;
    $(".picker span").style.background = cfg.a;
    $$(".font").forEach(b => { const on = b.dataset.f === cfg.font; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
  }

  // ---------- Sections (toggle + drag order) ----------
  function sectionOrder() {
    const on = cfg.sections;
    const off = GLC.SECTIONS.map(s => s.id).filter(id => !on.includes(id));
    return [...on, ...off];
  }
  function drawSections() {
    const names = Object.fromEntries(GLC.SECTIONS.map(s => [s.id, s.name]));
    $("#sections").innerHTML = sectionOrder().map(id => `
      <li draggable="true" data-id="${id}" class="${cfg.sections.includes(id) ? "" : "off"}">
        <span class="grip" aria-hidden="true"></span>
        <label class="switch tight"><input type="checkbox" ${cfg.sections.includes(id) ? "checked" : ""}><span></span>${names[id]}</label>
        <span class="move"><button type="button" data-d="-1" aria-label="Move ${names[id]} up">↑</button><button type="button" data-d="1" aria-label="Move ${names[id]} down">↓</button></span>
      </li>`).join("");
    $$("#sections li").forEach(li => {
      li.querySelector("input").addEventListener("change", e => {
        const order = sectionOrder();
        const checked = new Set(cfg.sections);
        e.target.checked ? checked.add(li.dataset.id) : checked.delete(li.dataset.id);
        cfg.sections = order.filter(id => checked.has(id));
        drawSections(); commit({ immediate: true });
      });
      li.querySelectorAll(".move button").forEach(b => b.addEventListener("click", () => {
        const order = sectionOrder(); const i = order.indexOf(li.dataset.id); const j = i + +b.dataset.d;
        if (j < 0 || j >= order.length) return;
        [order[i], order[j]] = [order[j], order[i]];
        cfg.sections = order.filter(id => cfg.sections.includes(id));
        drawSections(); commit({ immediate: true });
        $(`#sections li[data-id="${li.dataset.id}"] .move button[data-d="${b.dataset.d}"]`).focus();
      }));
    });
  }
  sortable($("#sections"), ids => { cfg.sections = ids.filter(id => cfg.sections.includes(id)); drawSections(); commit({ immediate: true }); });

  function sortable(list, onDrop) {
    let dragEl = null;
    list.addEventListener("dragstart", e => { dragEl = e.target.closest("li"); if (!dragEl) return; dragEl.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragEl.dataset.id); });
    list.addEventListener("dragover", e => {
      if (!dragEl) return; e.preventDefault();
      const after = [...list.children].filter(c => c !== dragEl).find(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      after ? list.insertBefore(dragEl, after) : list.appendChild(dragEl);
    });
    list.addEventListener("dragend", () => { if (!dragEl) return; dragEl.classList.remove("dragging"); dragEl = null; onDrop([...list.children].map(c => c.dataset.id)); });
  }

  // ---------- Experience ----------
  function drawExp() {
    $("#exp").innerHTML = cfg.exp.map((e, i) => `
      <div class="exp" data-i="${i}">
        <div class="two"><input class="in" data-f="role" placeholder="Role" value="${esc(e.role)}" aria-label="Role"><input class="in" data-f="org" placeholder="Organisation" value="${esc(e.org)}" aria-label="Organisation"></div>
        <input class="in" data-f="when" placeholder="2024 to now" value="${esc(e.when)}" aria-label="Dates">
        <textarea class="in" data-f="desc" rows="2" placeholder="One line on what you did" aria-label="Description">${esc(e.desc)}</textarea>
        <div class="exp-actions"><button type="button" data-a="up">Move up</button><button type="button" data-a="del">Remove</button></div>
      </div>`).join("") || `<p class="hint">Internships, research, clubs, or your degree.</p>`;
    $$(".exp").forEach(box => {
      const i = +box.dataset.i;
      box.querySelectorAll("[data-f]").forEach(inp => inp.addEventListener("input", () => { cfg.exp[i][inp.dataset.f] = inp.value; commit({ group: true }); }));
      box.querySelector("[data-a=del]").addEventListener("click", () => { cfg.exp.splice(i, 1); drawExp(); commit({ immediate: true }); });
      box.querySelector("[data-a=up]").addEventListener("click", () => { if (!i) return; [cfg.exp[i - 1], cfg.exp[i]] = [cfg.exp[i], cfg.exp[i - 1]]; drawExp(); commit({ immediate: true }); });
    });
  }
  $("#addExp").addEventListener("click", () => {
    cfg.exp.push({ role: "", org: "", when: "", desc: "" });
    drawExp(); commit({ immediate: true });
    const last = $$(".exp").pop(); if (last) { last.querySelector("[data-f=role]").focus(); }
  });

  // ---------- Skills ----------
  function drawSkills() {
    $("#skills").innerHTML = cfg.skills.map((s, i) => `<li>${esc(s)}<button type="button" data-i="${i}" aria-label="Remove ${esc(s)}">×</button></li>`).join("");
    $$("#skills button").forEach(b => b.addEventListener("click", () => { cfg.skills.splice(+b.dataset.i, 1); drawSkills(); commit({ immediate: true }); }));
  }
  $("#skillIn").addEventListener("keydown", e => {
    const v = e.target.value.trim();
    if ((e.key === "Enter" || e.key === ",") && v) {
      e.preventDefault();
      v.split(",").map(s => s.trim()).filter(Boolean).forEach(s => { if (!cfg.skills.includes(s)) cfg.skills.push(s); });
      e.target.value = ""; drawSkills(); commit({ immediate: true });
    } else if (e.key === "Backspace" && !e.target.value && cfg.skills.length) { cfg.skills.pop(); drawSkills(); commit({ immediate: true }); }
  });
  $("#skillBox").addEventListener("click", e => { if (e.target.id === "skillBox" || e.target.id === "skills") $("#skillIn").focus(); });

  // ---------- Repos ----------
  function drawRepos() {
    const list = $("#repos"), picked = $("#picked");
    if (!repoData) { list.innerHTML = `<li class="hint">Load a username to see repositories.</li>`; picked.innerHTML = ""; return; }
    const special = repoData.user.login.toLowerCase();
    const all = repoData.repos.filter(r => r.name.toLowerCase() !== special).sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at));
    const term = $("#repoQ").value.trim().toLowerCase();
    const shown = all.filter(r => !term || (r.name + " " + (r.description || "")).toLowerCase().includes(term));
    list.innerHTML = shown.map(r => `
      <li><label><input type="checkbox" value="${esc(r.name)}" ${cfg.featured.includes(r.name) ? "checked" : ""}>
        <span class="rn">${esc(r.name)}${r.fork ? ' <em>fork</em>' : ""}${r.archived ? ' <em>archived</em>' : ""}</span>
        <span class="rs">★ ${r.stargazers_count}</span></label></li>`).join("") || `<li class="hint">No repositories match.</li>`;
    $$("#repos input").forEach(cb => cb.addEventListener("change", () => {
      cb.checked ? cfg.featured.push(cb.value) : (cfg.featured = cfg.featured.filter(n => n !== cb.value));
      drawPicked(); commit({ immediate: true });
    }));
    drawPicked();
  }
  function drawPicked() {
    $("#picked").innerHTML = cfg.featured.map((n, i) => `<li draggable="true" data-id="${esc(n)}"><span class="grip" aria-hidden="true"></span><b>${i + 1}</b><span class="rn">${esc(n)}</span><button type="button" aria-label="Remove ${esc(n)}">×</button></li>`).join("");
    $$("#picked button").forEach(b => b.addEventListener("click", () => {
      const n = b.closest("li").dataset.id; cfg.featured = cfg.featured.filter(x => x !== n);
      drawRepos(); commit({ immediate: true });
    }));
    $("#clearPicks").hidden = !cfg.featured.length;
    $("#pickHint").textContent = cfg.featured.length ? "Drag to reorder. Automatic selection is paused while you have picks." : "Tick repos to feature them in exactly this order. The first one gets the large card.";
  }
  sortable($("#picked"), ids => { cfg.featured = ids; drawPicked(); commit({ immediate: true }); });
  $("#repoQ").addEventListener("input", drawRepos);
  $("#clearPicks").addEventListener("click", () => { cfg.featured = []; drawRepos(); commit({ immediate: true }); });

  // ---------- Username ----------
  async function loadUser(u) {
    u = (u || "").trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
    if (!u) { status("Enter a GitHub username.", "err"); return; }
    status(u === "__demo" ? "Loading the demo profile…" : `Loading @${u}…`, "busy");
    try {
      repoData = await GL.load(u);
      const changed = cfg.user.toLowerCase() !== u.toLowerCase();
      cfg.user = u;
      if (changed) cfg.featured = [];
      $("#user").value = u === "__demo" ? "" : u;
      const n = repoData.repos.length;
      status(u === "__demo" ? "Showing the demo profile. Enter your username to use your own." : `Loaded ${repoData.user.name || repoData.user.login}: ${n} public repositor${n === 1 ? "y" : "ies"}.`, "ok");
      drawRepos(); commit({ immediate: true });
    } catch (e) {
      repoData = null; drawRepos();
      const msg = { not_found: `There's no GitHub user called "${u}".`, rate_limit: "GitHub's hourly limit was reached. Add a token in Publish, or wait a few minutes.", bad_token: "Your saved token was rejected. Replace it in Publish." }[e.message] || "Couldn't reach GitHub. Check your connection.";
      status(msg, "err");
    }
  }
  $("#userForm").addEventListener("submit", e => { e.preventDefault(); loadUser($("#user").value); });
  $("#demo").addEventListener("click", () => loadUser("__demo"));

  // ---------- Publish ----------
  const shareUrl = () => new URL("portfolio.html#c=" + GLC.encode(cfg), location.href).href;
  async function share() {
    if (!cfg.user) return toast("Load a username first");
    try { await navigator.clipboard.writeText(shareUrl()); toast("Share link copied"); } catch (e) { prompt("Copy this link:", shareUrl()); }
  }
  function download() { if (!cfg.user) return toast("Load a username first"); frame.contentWindow.postMessage({ type: "gl:export" }, "*"); }
  $("#share").addEventListener("click", share); $("#share2").addEventListener("click", share);
  $("#download").addEventListener("click", download); $("#dl2").addEventListener("click", download);
  $("#pdf").addEventListener("click", () => { if (!cfg.user) return toast("Load a username first"); frame.contentWindow.postMessage({ type: "gl:print" }, "*"); });

  function pagesInfo() {
    const u = cfg.user && cfg.user !== "__demo" ? cfg.user.toLowerCase() : "username";
    $("#pagesRepo").textContent = `${u}.github.io`;
    $("#pagesUrl").textContent = `https://${u}.github.io`;
    $("#pagesUrl").href = `https://${u}.github.io`;
    $("#frameUrl").textContent = `${u === "username" ? "yourname" : u}.github.io`;
  }

  // Saved designs
  const getPresets = () => { try { return JSON.parse(localStorage.getItem("gl:presets") || "[]"); } catch (e) { return []; } };
  const setPresets = p => { try { localStorage.setItem("gl:presets", JSON.stringify(p)); } catch (e) {} };
  function drawPresets() {
    const p = getPresets();
    $("#presets").innerHTML = p.map((x, i) => `<li><button type="button" class="apply" data-i="${i}"><span class="dot" style="background:${esc(x.cfg.a)}"></span>${esc(x.name)}<small>${esc((GLC.TEMPLATES.find(t => t.id === x.cfg.t) || {}).name || "")}</small></button><button type="button" class="del" data-i="${i}" aria-label="Delete ${esc(x.name)}">×</button></li>`).join("") || `<li class="hint">Save a design to come back to it or compare looks.</li>`;
    $$("#presets .apply").forEach(b => b.addEventListener("click", () => { cfg = GLC.sanitize(getPresets()[+b.dataset.i].cfg); afterExternalChange(); toast("Design applied"); }));
    $$("#presets .del").forEach(b => b.addEventListener("click", () => { const p = getPresets(); p.splice(+b.dataset.i, 1); setPresets(p); drawPresets(); }));
  }
  $("#presetForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#presetName").value.trim() || `${GLC.TEMPLATES.find(t => t.id === cfg.t).name} design`;
    const p = getPresets().filter(x => x.name !== name); p.unshift({ name, cfg }); setPresets(p.slice(0, 20));
    $("#presetName").value = ""; drawPresets(); toast("Design saved");
  });
  $("#exportCfg").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" }));
    a.download = `gitloom-${cfg.user || "settings"}.json`; a.click();
  });
  $("#importCfg").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try { cfg = GLC.sanitize(JSON.parse(await f.text())); afterExternalChange(); toast("Settings imported"); }
    catch (err) { toast("That file isn't GitLoom settings"); }
    e.target.value = "";
  });

  // Token
  $("#token").value = GL.token();
  $("#saveToken").addEventListener("click", () => {
    const v = $("#token").value.trim();
    try { v ? localStorage.setItem("gl:token", v) : localStorage.removeItem("gl:token"); } catch (e) {}
    GL.clearCache(); toast(v ? "Token saved in this browser" : "Token removed");
    if (cfg.user) { repoData = null; frame.contentWindow.location.reload(); loadUser(cfg.user); }
  });
  $("#clearCache").addEventListener("click", () => {
    GL.clearCache(); toast("Fetching fresh data from GitHub");
    if (cfg.user) { repoData = null; frame.contentWindow.location.reload(); loadUser(cfg.user); }
  });

  // ---------- Keyboard ----------
  $("#undo").addEventListener("click", undo); $("#redo").addEventListener("click", redo);
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type !== "checkbox" && document.activeElement.type !== "range";
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y" && !typing) { e.preventDefault(); redo(); }
  });

  // ---------- Fill every control from cfg ----------
  function syncUI() {
    $$("[data-k]").forEach(el => {
      const v = cfg[el.dataset.k];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v == null ? "" : v;
    });
    $("#maxOut").textContent = cfg.max;
    $("#user").value = cfg.user === "__demo" ? "" : cfg.user;
    syncDesign(); drawSections(); drawExp(); drawSkills(); drawRepos(); drawPresets(); pagesInfo();
  }

  syncUI(); histUI();
  commit({ immediate: true });
  if (cfg.user) loadUser(cfg.user);
  else setTimeout(() => $("#user").focus(), 100);
})();
