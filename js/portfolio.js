/* GitLoom — portfolio page: boots from the URL (or from the studio via postMessage),
   renders, runs effects, and exports a single self-contained HTML file. */
(() => {
  const params = new URLSearchParams(location.search);
  const EMBED = params.get("embed") === "1";
  const DEMO = params.get("demo") === "1";
  let cfg = GLC.fromLocation() || GLC.defaults();
  if (DEMO && !cfg.user) cfg.user = "__demo";
  let data = null, loadedUser = null, last = null;

  if (EMBED) document.body.classList.add("embed");

  // Contrast-safe text colour for anything sitting on the accent.
  function onAccent(hex) {
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    const L = .2126 * ch[0] + .7152 * ch[1] + .0722 * ch[2];
    return L > .4 ? "#0d0d0d" : "#ffffff";
  }
  function themeVars(c) {
    const f = GLC.FONTS.find(x => x.id === c.font);
    return `--ac:${c.a};--on-ac:${onAccent(c.a)};${f && f.css ? `--fd:${f.css};` : ""}`;
  }

  // ---------------------------------------------------------------------------
  // RUNTIME: copied verbatim into exported sites, so it must stay self-contained.
  // ---------------------------------------------------------------------------
  function runtime() {
    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("nomotion");
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

    // Reveal on scroll
    var targets = $$(".sh, .card, .stat, .about-body, .md, .lang-wrap, .heat-wrap, .feed, .timeline li, .skill-list, .contact-h, .links");
    if (!reduce && "IntersectionObserver" in window) {
      targets.forEach(function (el) { el.classList.add("reveal"); });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
      targets.forEach(function (el) { io.observe(el); });
    }

    // Count-up stats
    $$(".count").forEach(function (el) {
      var n = +el.getAttribute("data-n");
      if (reduce || !n) { el.textContent = n.toLocaleString(); return; }
      var t0 = 0;
      var run = function (t) {
        if (!t0) t0 = t;
        var k = Math.min((t - t0) / 1400, 1);
        el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))).toLocaleString();
        if (k < 1) requestAnimationFrame(run);
      };
      var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { o.disconnect(); requestAnimationFrame(run); } });
      o.observe(el);
    });

    // Typing line
    var ty = $(".type");
    if (ty && !reduce) {
      var s = ty.getAttribute("data-text"), i = 0;
      ty.textContent = "";
      (function step() { ty.textContent = s.slice(0, ++i); if (i < s.length) setTimeout(step, 34); })();
    }

    // Card tilt (fine pointers only)
    if (!reduce && matchMedia("(pointer: fine)").matches) {
      $$(".tilt").forEach(function (c) {
        c.addEventListener("pointermove", function (e) {
          var r = c.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          c.style.setProperty("--mx", (x + 0.5) * 100 + "%");
          c.style.setProperty("--my", (y + 0.5) * 100 + "%");
          c.style.transform = "perspective(900px) rotateY(" + x * 5 + "deg) rotateX(" + -y * 5 + "deg) translateY(-3px)";
        });
        c.addEventListener("pointerleave", function () { c.style.transform = ""; });
      });
    }

    // Project filters + search
    var grid = $(".projects .grid"), empty = $(".projects .empty"), lang = "*", q = "";
    function filter() {
      var shown = 0;
      $$(".card", grid).forEach(function (c) {
        var ok = (lang === "*" || c.getAttribute("data-lang") === lang) && (!q || c.getAttribute("data-q").indexOf(q) > -1);
        c.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    }
    $$(".chip").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".chip").forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("on"); b.setAttribute("aria-pressed", "true");
        lang = b.getAttribute("data-lang"); filter();
      });
    });
    var ps = $(".psearch input");
    if (ps) ps.addEventListener("input", function () { q = ps.value.trim().toLowerCase(); filter(); });

    // Copy email
    $$(".copy-mail").forEach(function (b) {
      b.addEventListener("click", function () {
        var done = function () { var sp = $("span", b); sp.textContent = "Copied"; setTimeout(function () { sp.textContent = "Copy"; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(b.getAttribute("data-mail")).then(done, function () {}); else done();
      });
    });

    // Quick menu (⌘K / Ctrl+K)
    var kbar = $(".kbar");
    if (kbar) {
      var kin = $(".kbar-in", kbar), list = $(".kbar-list", kbar), items = [], sel = 0;
      $$("section[id]").forEach(function (s) {
        var label = s.getAttribute("data-k") || (s.id === "top" ? "Top" : s.id);
        items.push({ label: "Go to " + label, hint: "Section", go: function () { s.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); } });
      });
      $$(".card h3 a").forEach(function (a) { items.push({ label: a.textContent, hint: "Project", go: function () { window.open(a.href, "_blank", "noopener"); } }); });
      $$(".links a").forEach(function (a) { items.push({ label: "Open " + a.textContent.trim(), hint: "Link", go: function () { window.open(a.href, a.href.indexOf("mailto:") === 0 ? "_self" : "_blank", "noopener"); } }); });
      var mail = $(".copy-mail");
      if (mail) items.push({ label: "Copy email address", hint: "Action", go: function () { mail.click(); } });
      items.push({ label: "Print or save as PDF", hint: "Action", go: function () { setTimeout(function () { print(); }, 50); } });
      var shown = items;
      var draw = function () {
        list.innerHTML = "";
        shown.forEach(function (it, i) {
          var li = document.createElement("li");
          li.setAttribute("role", "option");
          li.setAttribute("aria-selected", i === sel ? "true" : "false");
          li.innerHTML = "<span></span><small></small>";
          li.firstChild.textContent = it.label; li.lastChild.textContent = it.hint;
          li.addEventListener("click", function () { close(); it.go(); });
          li.addEventListener("pointermove", function () { if (sel !== i) { sel = i; draw(); } });
          list.appendChild(li);
        });
        var cur = list.children[sel]; if (cur) cur.scrollIntoView({ block: "nearest" });
      };
      var open = function () { kbar.hidden = false; kin.value = ""; shown = items; sel = 0; draw(); setTimeout(function () { kin.focus(); }, 10); };
      var close = function () { kbar.hidden = true; };
      kin.addEventListener("input", function () {
        var v = kin.value.toLowerCase();
        shown = items.filter(function (it) { return (it.label + " " + it.hint).toLowerCase().indexOf(v) > -1; });
        sel = 0; draw();
      });
      kin.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { sel = Math.min(sel + 1, shown.length - 1); draw(); e.preventDefault(); }
        else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
        else if (e.key === "Enter" && shown[sel]) { var it = shown[sel]; close(); it.go(); }
        else if (e.key === "Escape") close();
      });
      kbar.addEventListener("click", function (e) { if (e.target === kbar) close(); });
      var kb = $(".kbtn"); if (kb) kb.addEventListener("click", open);
      window.__glOpenK = open; window.__glCloseK = close;
    }

    // Global listeners attach once (the studio re-renders this page many times).
    if (!window.__glrt) {
      window.__glrt = true;
      document.addEventListener("keydown", function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && window.__glOpenK) { e.preventDefault(); window.__glOpenK(); }
      });
      var pb = $(".progress"), glow = $(".fx-bg"), nav = null;
      addEventListener("scroll", function () {
        var h = document.documentElement.scrollHeight - innerHeight;
        if (pb) pb.style.transform = "scaleX(" + (h > 0 ? scrollY / h : 0) + ")";
        nav = nav || $(".nav"); if (nav) nav.classList.toggle("stuck", scrollY > 24);
      }, { passive: true });
      if (glow && !reduce && matchMedia("(pointer: fine)").matches) {
        addEventListener("pointermove", function (e) {
          glow.style.setProperty("--gx", e.clientX + "px");
          glow.style.setProperty("--gy", e.clientY + "px");
        }, { passive: true });
      }
    }
  }

  // ---------------------------------------------------------------------------
  function paint(c) {
    const keepY = scrollY;
    last = GLR.render(data, c);
    document.body.dataset.t = c.t;
    document.body.setAttribute("style", themeVars(c));
    document.body.classList.toggle("nomotion", !c.motion);
    document.title = last.title;
    document.getElementById("app").innerHTML = last.body;
    runtime();
    if (EMBED) scrollTo(0, keepY);
  }

  function showError(err) {
    const map = {
      not_found: [`There's no GitHub user called "${cfg.user}".`, "Check the spelling, then try again."],
      rate_limit: ["GitHub's hourly limit for anonymous requests has been reached.", "Wait a few minutes, or add a personal access token in the studio to raise the limit."],
      bad_token: ["Your GitHub token was rejected.", "Remove or replace it in the studio's Publish tab."],
      no_user: ["No username yet.", "Enter a GitHub username in the studio to start."]
    };
    const [h, p] = map[err] || ["Couldn't reach GitHub.", "Check your connection and try again."];
    document.body.dataset.t = cfg.t;
    document.body.setAttribute("style", themeVars(cfg));
    document.getElementById("app").innerHTML = `<div class="err"><h1>${GL.esc(h)}</h1><p>${GL.esc(p)}</p>${EMBED ? "" : '<a class="btn" href="studio.html">Open the studio</a>'}</div>`;
    if (EMBED) parent.postMessage({ type: "gl:status", state: "error", code: err, msg: h }, "*");
  }

  async function show(c) {
    cfg = c;
    if (!c.user) return showError("no_user");
    try {
      if (loadedUser !== c.user) {
        if (!data) document.getElementById("app").innerHTML = '<div class="loading"><span></span><p>Weaving your site</p></div>';
        data = await GL.load(c.user);
        loadedUser = c.user;
      }
      paint(c);
      if (EMBED) parent.postMessage({ type: "gl:status", state: "ready" }, "*");
    } catch (e) { loadedUser = null; data = null; showError(e.message); }
  }

  // ---------- Export a single self-contained HTML file ----------
  async function getCss() {
    try { const r = await fetch("css/portfolio.css"); if (r.ok) return await r.text(); } catch (e) {}
    try {
      const sheet = [...document.styleSheets].find(s => (s.href || "").includes("portfolio.css"));
      return [...sheet.cssRules].map(r => r.cssText).join("\n");
    } catch (e) { return null; }
  }

  async function buildExport() {
    if (!last) return null;
    const css = await getCss();
    if (!css) { alert("Couldn't read css/portfolio.css. Open GitLoom through a local server (VS Code Live Server) and try again."); return null; }
    const e = GL.esc;
    const tmp = document.createElement("div");
    tmp.innerHTML = last.body;
    tmp.querySelectorAll(".count").forEach(x => (x.textContent = Number(x.dataset.n).toLocaleString()));
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${e(last.title)}</title>
<meta name="description" content="${e(last.description)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${e(last.title)}">
<meta property="og:description" content="${e(last.description)}">
<meta property="og:image" content="${e(last.image)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="${e(cfg.a)}">
<link rel="icon" href="${e(last.image)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${GLC.FONT_URL}">
<script type="application/ld+json">${JSON.stringify(last.person).replace(/</g, "\\u003c")}</script>
<style>
${css}
</style>
</head>
<body data-t="${e(cfg.t)}" class="${cfg.motion ? "" : "nomotion"}" style="${themeVars(cfg)}">
<div class="progress"></div><div class="fx-bg"></div>
<div id="app">${tmp.innerHTML}</div>
<script>(${runtime.toString()})();</script>
</body>
</html>`;
    return html;
  }

  async function download() {
    const html = await buildExport();
    if (!html) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = cfg.user === "__demo" ? "demo-portfolio.html" : "index.html";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- Messages from the studio ----------
  addEventListener("message", async ev => {
    if (ev.origin !== location.origin && location.origin !== "null") return;
    const m = ev.data || {};
    if (m.type === "gl:render") show(GLC.sanitize(m.cfg));
    if (m.type === "gl:export") {
      const html = await buildExport();
      ev.source.postMessage({ type: "gl:exported", html, user: cfg.user }, "*");
    }
    if (m.type === "gl:print") print();
  });

  // ---------- Standalone toolbar ----------
  if (!EMBED) {
    const bar = document.querySelector(".toolbar");
    bar.hidden = false;
    const edit = bar.querySelector("[data-act=edit]");
    edit.href = "studio.html#c=" + GLC.encode(cfg);
    edit.addEventListener("click", () => { edit.href = "studio.html#c=" + GLC.encode(cfg); });
    bar.querySelector("[data-act=copy]").onclick = async ev => {
      const b = ev.currentTarget;
      try { await navigator.clipboard.writeText(location.href); b.textContent = "Link copied"; } catch (e) { b.textContent = "Copy failed"; }
      setTimeout(() => (b.textContent = "Copy link"), 1600);
    };
    bar.querySelector("[data-act=pdf]").onclick = () => print();
    bar.querySelector("[data-act=download]").onclick = download;
  }

  addEventListener("hashchange", () => { const c = GLC.fromLocation(); if (c) { if (DEMO && !c.user) c.user = "__demo"; show(c); } });

  if (EMBED) parent.postMessage({ type: "gl:status", state: "booted" }, "*");
  else show(cfg);
  if (EMBED && GLC.fromLocation()) show(cfg);
})();
