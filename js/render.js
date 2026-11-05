/* GitLoom — renders a portfolio (HTML string) from GitHub data + config.
   Every template uses this same markup; css/portfolio.css gives each one its own look. */
window.GLR = (() => {
  const esc = s => GL.esc(s);

  const LANG_COLORS = {
    JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219", "C++": "#f34b7d", C: "#555555",
    "C#": "#178600", Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516", PHP: "#4F5D95", Swift: "#F05138", Kotlin: "#A97BFF",
    Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c", SCSS: "#c6538c", Shell: "#89e051", Svelte: "#ff3e00", Vue: "#41b883",
    "Jupyter Notebook": "#DA5B0B", R: "#198CE7", MATLAB: "#e16737", Lua: "#000080", Scala: "#c22d40", Haskell: "#5e5086",
    Elixir: "#6e4a7e", Arduino: "#bd79d1", Solidity: "#AA6746", Dockerfile: "#384d54", Makefile: "#427819", Zig: "#ec915c",
    "Objective-C": "#438eff", Perl: "#0298c3", Julia: "#a270ba", Verilog: "#b2b7f8", VHDL: "#adb2cb", Assembly: "#6E4C13",
    CMake: "#DA3434", Nix: "#7e7eff", Other: "#9a9a9a"
  };
  const langColor = n => LANG_COLORS[n] || "#8b8b8b";

  const I = {
    mail: '<path d="M3 6h18v12H3z"/><path d="m3 7 9 6 9-6"/>',
    linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
    x: '<path d="M4 4l16 16M20 4 4 20"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
    github: '<path d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    fork: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v2a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7M12 12v5"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>'
  };
  const icon = (n, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;

  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    const steps = [[31536000, "year"], [2592000, "month"], [604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
    for (const [n, u] of steps) if (s >= n) { const k = Math.floor(s / n); return `${k} ${u}${k > 1 ? "s" : ""} ago`; }
    return "just now";
  }
  const fmt = n => n >= 1e4 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
  const safeUrl = u => { if (!u) return ""; const v = /^https?:\/\//i.test(u) ? u : "https://" + u; return /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : ""; };

  // ---------- Markdown (profile README) with a strict allow-list sanitizer ----------
  const ALLOWED = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "A", "IMG", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "CODE", "PRE", "BR", "HR", "BLOCKQUOTE", "DIV", "SPAN", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "DEL", "PICTURE", "SOURCE", "DETAILS", "SUMMARY", "SUB", "SUP"]);
  const ATTRS = { A: ["href", "title"], IMG: ["src", "alt", "width", "height"], SOURCE: ["srcset", "media"] };
  function basicMd(md) {
    const lines = esc(md).split(/\n{2,}/);
    return lines.map(b => {
      if (/^#{1,6} /.test(b)) { const n = b.match(/^#+/)[0].length; return `<h${n}>${b.replace(/^#+ /, "")}</h${n}>`; }
      if (/^(- |\* )/.test(b)) return "<ul>" + b.split("\n").map(l => `<li>${l.replace(/^(- |\* )/, "")}</li>`).join("") + "</ul>";
      if (/^&gt; /.test(b)) return `<blockquote>${b.replace(/^&gt; /gm, "")}</blockquote>`;
      return `<p>${b.replace(/\n/g, "<br>")}</p>`;
    }).join("")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  }
  function readmeHtml(readme) {
    if (!readme || !readme.text) return "";
    let html = window.marked && window.marked.parse ? window.marked.parse(readme.text, { gfm: true }) : basicMd(readme.text);
    const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html");
    const root = doc.getElementById("r");
    (function clean(node) {
      [...node.children].forEach(el => {
        if (!ALLOWED.has(el.tagName)) { el.replaceWith(...el.childNodes); return clean(node); }
        [...el.attributes].forEach(a => { if (!(ATTRS[el.tagName] || []).includes(a.name) && a.name !== "align") el.removeAttribute(a.name); });
        ["href", "src"].forEach(k => {
          const v = el.getAttribute(k);
          if (v == null) return;
          if (/^\s*(javascript|data|vbscript):/i.test(v)) { el.removeAttribute(k); return; }
          if (k === "src" && !/^https?:/i.test(v) && readme.base) el.setAttribute(k, readme.base + v.replace(/^\.?\//, ""));
          if (k === "href") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
        });
        if (el.tagName === "SOURCE") el.removeAttribute("srcset");
        if (el.tagName === "IMG") el.setAttribute("loading", "lazy");
        clean(el);
      });
    })(root);
    return root.innerHTML;
  }

  // ---------- Pieces ----------
  function head(title, label, cmd) {
    return `<h2 class="sh" data-cmd="${esc(cmd)}"><small>${esc(label)}</small><span>${esc(title)}</span></h2>`;
  }

  function donut(languages) {
    let off = 0;
    const R = 54, C = 2 * Math.PI * R;
    const arcs = languages.map(l => {
      const len = (l.pct / 100) * C;
      const s = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${langColor(l.name)}" stroke-width="20" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"><title>${esc(l.name)} ${l.pct.toFixed(1)}%</title></circle>`;
      off += len; return s;
    }).join("");
    return `<svg class="donut" viewBox="0 0 140 140" role="img" aria-label="Language share"><g transform="rotate(-90 70 70)">${arcs}</g><text x="70" y="66" text-anchor="middle" class="d1">${languages.length >= 1 ? esc(languages[0].name) : ""}</text><text x="70" y="86" text-anchor="middle" class="d2">${languages[0] ? languages[0].pct.toFixed(0) + "%" : ""}</text></svg>`;
  }

  function heatmap(days) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - (7 * 13 - 1) - start.getDay());
    const vals = Object.values(days).filter(Boolean).sort((a, b) => a - b);
    const q = p => vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * p))] : 1;
    const t = [q(.25), q(.5), q(.8)];
    let cells = "", total = 0, active = 0;
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
      const v = days[local] || days[key] || 0;
      total += v; if (v) active++;
      const lv = !v ? 0 : v <= t[0] ? 1 : v <= t[1] ? 2 : v <= t[2] ? 3 : 4;
      cells += `<i class="l${lv}" title="${local}: ${v} contribution${v === 1 ? "" : "s"}"></i>`;
    }
    return { html: `<div class="heat" role="img" aria-label="Public activity, last 13 weeks">${cells}</div>`, total, active };
  }

  function card(r, i, feature) {
    const live = safeUrl(r.homepage);
    return `<article class="card${feature ? " feature" : ""} tilt" data-lang="${esc(r.language || "Other")}" data-q="${esc((r.name + " " + (r.description || "") + " " + (r.topics || []).join(" ")).toLowerCase())}" style="--i:${i}">
      <div class="card-top"><span class="ldot" style="--c:${langColor(r.language)}"></span>${esc(r.language || "Mixed")}<span class="upd">Updated ${ago(r.pushed_at)}</span></div>
      <h3><a href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.name)}</a></h3>
      <p>${esc(r.description || "No description yet.")}</p>
      ${r.topics && r.topics.length ? `<div class="tags">${r.topics.slice(0, 4).map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="meta"><span title="Stars">${icon("star")}${fmt(r.stargazers_count)}</span><span title="Forks">${icon("fork")}${fmt(r.forks_count)}</span>${live ? `<a class="live" href="${esc(live)}" target="_blank" rel="noopener">Live site ${icon("out")}</a>` : ""}</div>
    </article>`;
  }

  // ---------- Main ----------
  function render(data, cfg) {
    const { user, readme } = data;
    const A = GL.analyse(data, cfg);
    const name = user.name || user.login;
    const first = name.split(" ")[0];
    const langs = A.languages.filter(l => l.name !== "Other");
    const topLang = langs[0] ? langs[0].name : "code";
    const headline = cfg.hl || (langs.length > 1 ? `I build with ${langs[0].name} and ${langs[1].name}.` : `I build things in ${topLang}.`);
    const bio = cfg.bio || user.bio || `I build things on GitHub, mostly in ${topLang}.`;
    const loc = cfg.loc || user.location || "";
    const has = s => cfg.sections.includes(s);
    const typeText = `@${user.login}` + langs.slice(0, 3).map(l => "  /  " + l.name).join("");

    const links = [];
    if (cfg.em) links.push(["Email", "mailto:" + cfg.em, "mail", cfg.em]);
    if (cfg.li) links.push(["LinkedIn", "https://www.linkedin.com/in/" + encodeURIComponent(cfg.li.replace(/^.*linkedin\.com\/in\//, "").replace(/\/$/, "")), "linkedin"]);
    if (cfg.x) links.push(["X", "https://x.com/" + encodeURIComponent(cfg.x), "x"]);
    if (safeUrl(cfg.web)) links.push(["Website", safeUrl(cfg.web), "globe"]);
    if (safeUrl(cfg.resume)) links.push(["Résumé", safeUrl(cfg.resume), "file"]);
    links.push(["GitHub", user.html_url, "github"]);

    const navMap = { projects: "Work", about: "About", experience: "Experience", contact: "Contact" };
    const nav = cfg.sections.filter(s => navMap[s]).map(s => `<a href="#${s}">${navMap[s]}</a>`).join("");

    const S = {};
    S.about = () => `
      <section class="block about" id="about" data-k="About">
        ${head("A little about me", "About", "cat about.md")}
        <div class="about-body">
          <p class="lead">${esc(bio)}</p>
          <ul class="facts">
            ${loc ? `<li>${icon("pin")}${esc(loc)}</li>` : ""}
            ${user.company ? `<li>${esc(user.company.replace(/^@/, ""))}</li>` : ""}
            <li>On GitHub since ${new Date(user.created_at).getFullYear()}</li>
            <li>${fmt(user.followers)} followers</li>
          </ul>
        </div>
      </section>`;
    S.readme = () => {
      const h = readmeHtml(readme);
      return h ? `<section class="block readme" id="readme" data-k="README">${head("From my GitHub profile", "README", "cat README.md")}<div class="md">${h}</div></section>` : "";
    };
    S.projects = () => {
      if (!A.top.length) return "";
      const ls = [...new Set(A.top.map(r => r.language || "Other"))];
      return `
      <section class="block projects" id="projects" data-k="Work">
        ${head("Things I've built", "Selected work", "ls ./projects")}
        <div class="pbar">
          ${ls.length > 1 ? `<div class="chips" role="group" aria-label="Filter by language"><button class="chip on" data-lang="*" aria-pressed="true">All</button>${ls.map(l => `<button class="chip" data-lang="${esc(l)}" aria-pressed="false"><span class="ldot" style="--c:${langColor(l)}"></span>${esc(l)}</button>`).join("")}</div>` : "<div></div>"}
          ${A.top.length > 4 ? `<label class="psearch"><span class="sr">Search projects</span><input type="search" placeholder="Search projects" autocomplete="off"></label>` : ""}
        </div>
        <div class="grid">${A.top.map((r, i) => card(r, i, i === 0)).join("")}</div>
        <p class="empty" hidden>No projects match that filter.</p>
      </section>`;
    };
    S.languages = () => !A.languages.length ? "" : `
      <section class="block languages" id="languages" data-k="Languages">
        ${head("What I write in", "Languages", "tokei --sort code")}
        <div class="lang-wrap">
          ${donut(A.languages)}
          <div class="bars">${A.languages.map(l => `<div class="row"><span><span class="ldot" style="--c:${langColor(l.name)}"></span>${esc(l.name)}</span><div class="track"><i style="--w:${Math.max(1.5, l.pct).toFixed(1)}%;--c:${langColor(l.name)}"></i></div><b>${l.pct < 1 ? "<1" : l.pct.toFixed(0)}%</b></div>`).join("")}</div>
        </div>
      </section>`;
    S.activity = () => {
      const h = heatmap(A.days);
      return `
      <section class="block activity" id="activity" data-k="Activity">
        ${head("Recent activity", "Activity", "git log --since=90.days")}
        ${h.total ? `<p class="act-sum"><b>${fmt(h.total)}</b> public contributions across <b>${h.active}</b> days in the last 13 weeks.</p>
        <div class="heat-wrap">${h.html}<div class="heat-key"><span>Less</span><i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i><span>More</span></div></div>
        ${A.feed.length ? `<ol class="feed">${A.feed.map(f => `<li><span>${esc(f.verb)} <a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.repo)}</a></span><time datetime="${esc(f.at)}">${ago(f.at)}</time></li>`).join("")}</ol>` : ""}`
        : `<p class="act-sum">No public activity in the last 90 days.</p>`}
      </section>`;
    };
    const exp = cfg.exp.filter(e => e.role || e.org);
    S.experience = () => !exp.length ? "" : `
      <section class="block experience" id="experience" data-k="Experience">
        ${head("Where I've worked and studied", "Experience", "cat experience.log")}
        <ol class="timeline">${exp.map(e => `<li><div class="tl-when">${esc(e.when)}</div><div class="tl-body"><h3>${esc(e.role)}${e.org ? ` <span>${esc(e.org)}</span>` : ""}</h3>${e.desc ? `<p>${esc(e.desc)}</p>` : ""}</div></li>`).join("")}</ol>
      </section>`;
    S.skills = () => !cfg.skills.length ? "" : `
      <section class="block skills" id="skills" data-k="Skills">
        ${head("Tools I reach for", "Skills", "which --all")}
        <ul class="skill-list">${cfg.skills.map(s => `<li>${esc(s)}</li>`).join("")}</ul>
      </section>`;
    S.contact = () => `
      <section class="block contact" id="contact" data-k="Contact">
        <h2 class="contact-h">Let's build something together.</h2>
        ${cfg.em ? `<p class="contact-mail"><a href="mailto:${esc(cfg.em)}">${esc(cfg.em)}</a><button class="copy-mail" data-mail="${esc(cfg.em)}" aria-label="Copy email address">${icon("copy")}<span>Copy</span></button></p>` : ""}
        <div class="links">${links.map(([l, h, ic]) => `<a class="btn ghost" href="${esc(h)}" ${h.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"'}>${icon(ic)}${esc(l)}</a>`).join("")}</div>
      </section>`;

    const body = `
      <header class="nav">
        <a class="brand" href="#top"><i>${esc(name[0].toUpperCase())}</i><span>${esc(first)}</span></a>
        <nav aria-label="Sections">${nav}</nav>
        ${cfg.cmdk ? `<button class="kbtn" aria-label="Open quick menu"><kbd>⌘K</kbd></button>` : ""}
      </header>
      <main class="sheet">
        <section class="hero" id="top">
          <div class="hero-copy">
            ${cfg.avail ? `<p class="avail"><i></i>${esc(cfg.availText || "Available for work")}</p>` : ""}
            <p class="who">${esc(name)}</p>
            <h1 class="headline">${esc(headline)}</h1>
            <p class="sub"><span class="type" data-text="${esc(typeText)}">${esc(typeText)}</span></p>
            <div class="cta">
              ${has("projects") && A.top.length ? `<a class="btn" href="#projects">See my work</a>` : ""}
              ${has("contact") ? `<a class="btn ghost" href="#contact">Get in touch</a>` : ""}
              ${safeUrl(cfg.resume) ? `<a class="btn ghost" href="${esc(safeUrl(cfg.resume))}" target="_blank" rel="noopener">${icon("file")}Résumé</a>` : ""}
            </div>
          </div>
          ${cfg.photo ? `<figure class="portrait"><img src="${esc(user.avatar_url)}" alt="${esc(name)}" width="460" height="460"></figure>` : ""}
        </section>
        ${A.languages.length ? `<div class="marquee" aria-hidden="true"><div>${[0, 1].map(() => A.languages.filter(l => l.name !== "Other").map(l => `<span>${esc(l.name)}</span>`).join("")).join("")}</div></div>` : ""}
        <section class="stats" aria-label="GitHub numbers">
          <div class="stat"><b class="count" data-n="${A.ownCount}">${A.ownCount}</b><span>Repositories</span></div>
          <div class="stat"><b class="count" data-n="${A.stars}">${A.stars}</b><span>Stars earned</span></div>
          <div class="stat"><b class="count" data-n="${user.followers}">${user.followers}</b><span>Followers</span></div>
          <div class="stat"><b class="count" data-n="${A.years}">${A.years}</b><span>Years on GitHub</span></div>
        </section>
        ${cfg.sections.map(s => (S[s] ? S[s]() : "")).join("")}
      </main>
      <footer class="foot"><span>© ${new Date().getFullYear()} ${esc(name)}</span>${cfg.credit ? `<span>Made with <a href="https://github.com/HemashreeVI/GitLoom" target="_blank" rel="noopener">GitLoom</a></span>` : ""}</footer>
      ${cfg.cmdk ? `<div class="kbar" hidden role="dialog" aria-modal="true" aria-label="Quick menu"><div class="kbar-box"><input class="kbar-in" placeholder="Jump to a section, open a project…" aria-label="Search"><ul class="kbar-list" role="listbox"></ul><p class="kbar-hint"><kbd>↑</kbd><kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, <kbd>Esc</kbd> to close</p></div></div>` : ""}
    `;

    const desc = (cfg.hl ? cfg.hl + " " : "") + bio;
    return {
      body,
      title: `${name} — ${cfg.hl || "Portfolio"}`,
      description: desc.slice(0, 200),
      image: user.avatar_url,
      url: user.html_url,
      person: { "@context": "https://schema.org", "@type": "Person", name, url: safeUrl(cfg.web) || user.html_url, image: user.avatar_url, sameAs: links.filter(l => !l[1].startsWith("mailto:")).map(l => l[1]), jobTitle: cfg.hl || undefined, address: loc || undefined }
    };
  }

  return { render, langColor };
})();
