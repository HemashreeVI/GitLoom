(() => {
  const q = new URLSearchParams(location.search);
  const TEMPLATES = ["editorial", "midnight", "sunrise"];
  const P = {
    user: (q.get("user") || "").trim().replace(/^@/, ""),
    t: TEMPLATES.includes(q.get("t")) ? q.get("t") : "editorial",
    a: /^#[0-9a-f]{6}$/i.test(q.get("a") || "") ? q.get("a") : "#ff4d2e",
    hl: q.get("hl") || "", em: q.get("em") || "", li: q.get("li") || "",
    x: (q.get("x") || "").replace(/^@/, ""), web: q.get("web") || "",
    show: (q.get("show") || "about,projects,languages,contact").split(","),
    photo: q.get("photo") !== "0"
  };
  const { esc } = GL;
  const has = s => P.show.includes(s);

  document.body.dataset.t = P.t;
  document.documentElement.style.setProperty("--ac", P.a);

  // Effects: this function is also copied into the exported site, so it must stay self-contained.
  function initFx() {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => io.observe(el));
    const g = document.querySelector(".glow");
    if (g) addEventListener("pointermove", e => { g.style.transform = `translate(${e.clientX - 200}px,${e.clientY - 200}px)`; });
    document.querySelectorAll(".tilt").forEach(c => {
      c.addEventListener("pointermove", e => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
      });
      c.addEventListener("pointerleave", () => { c.style.transform = ""; });
    });
    const pb = document.querySelector(".progress");
    if (pb) addEventListener("scroll", () => {
      pb.style.width = (scrollY / (document.body.scrollHeight - innerHeight) * 100) + "%";
    });
  }

  function fixUrl(u) { return /^https?:\/\//i.test(u) ? u : "https://" + u; }

  function render({ user, repos }) {
    const { own, stars, languages, top } = GL.analyse(repos);
    const name = user.name || user.login;
    const topLang = languages[0] ? languages[0].name : "Code";
    const headline = P.hl || `Developer + ${topLang}`;
    const typeText = `Building at @${user.login}` + languages.slice(0, 3).map(l => " · " + l.name).join("");
    const joined = new Date(user.created_at).getFullYear();

    const links = [];
    if (P.em) links.push(["Email", "mailto:" + P.em]);
    if (P.li) links.push(["LinkedIn", "https://www.linkedin.com/in/" + encodeURIComponent(P.li)]);
    if (P.x) links.push(["X", "https://x.com/" + encodeURIComponent(P.x)]);
    if (P.web) links.push(["Website", fixUrl(P.web)]);
    links.push(["GitHub", user.html_url]);

    const nav = [["projects", "Work"], ["about", "About"], ["contact", "Contact"]]
      .filter(([k]) => has(k)).map(([k, l]) => `<a href="#${k}">${l}</a>`).join("");

    const marquee = languages.length
      ? `<div class="marquee"><div>${[0, 1].map(() => languages.map(l => `<span>${esc(l.name)}</span>`).join("")).join("")}</div></div>` : "";

    document.title = `${name} — Portfolio`;
    document.getElementById("app").innerHTML = `
      <div class="top">
        <header class="nav">
          <a class="brand" href="#top"><i>${esc(name[0].toUpperCase())}</i>${esc(name.split(" ")[0])}</a>
          <nav>${nav}</nav>
        </header>
        <section class="hero" id="top">
          <div>
            <p class="eyebrow reveal">${esc(name)}</p>
            <h1 class="reveal">${esc(headline)}</h1>
            <p class="sub reveal"><span class="type" data-text="${esc(typeText)}"></span></p>
            <div class="cta reveal">
              ${has("projects") ? `<a class="btn" href="#projects">See my work</a>` : ""}
              ${has("contact") ? `<a class="btn ghost" href="#contact">Get in touch</a>` : ""}
            </div>
          </div>
          ${P.photo ? `<img class="avatar" src="${esc(user.avatar_url)}" alt="${esc(name)}">` : ""}
        </section>
      </div>
      ${marquee}
      <section class="stats">
        <div class="stat reveal"><b class="count" data-n="${own.length}">0</b><span>Repositories</span></div>
        <div class="stat reveal"><b class="count" data-n="${stars}">0</b><span>Stars earned</span></div>
        <div class="stat reveal"><b class="count" data-n="${user.followers}">0</b><span>Followers</span></div>
        <div class="stat reveal"><b class="count" data-n="${languages.length}">0</b><span>Languages</span></div>
      </section>
      ${has("about") ? `
      <section class="block about" id="about">
        <h2 class="reveal"><small>About</small>A little about me</h2>
        <p class="reveal">${esc(user.bio || `I build things on GitHub, mostly in ${topLang}.`)}</p>
        <div class="facts reveal">
          ${user.location ? `<span>📍 ${esc(user.location)}</span>` : ""}
          <span>On GitHub since ${joined}</span>
          <span>${user.following} following</span>
          ${user.company ? `<span>${esc(user.company)}</span>` : ""}
        </div>
      </section>` : ""}
      ${has("projects") && top.length ? `
      <section class="block" id="projects">
        <h2 class="reveal"><small>Selected work</small>Projects</h2>
        <div class="grid">
          ${top.map((r, i) => `
            <a class="card tilt reveal" style="transition-delay:${(i % 3) * 0.08}s" href="${esc(r.html_url)}" target="_blank" rel="noopener">
              <h3>${esc(r.name)}</h3>
              <p>${esc(r.description || "No description yet.")}</p>
              ${r.topics && r.topics.length ? `<div class="tags">${r.topics.slice(0, 4).map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
              <div class="meta"><span>★ ${r.stargazers_count}</span><span>⑂ ${r.forks_count}</span><span>${esc(r.language || "—")}</span></div>
            </a>`).join("")}
        </div>
      </section>` : ""}
      ${has("languages") && languages.length ? `
      <section class="block" id="languages">
        <h2 class="reveal"><small>Toolbox</small>Languages</h2>
        <div class="bars reveal">
          ${languages.map(l => `<div class="row"><span>${esc(l.name)}</span><div class="track"><i style="--w:${l.pct}%"></i></div><span>${l.pct}%</span></div>`).join("")}
        </div>
      </section>` : ""}
      ${has("contact") ? `
      <section class="contact" id="contact">
        <h2 class="reveal">Let’s build<br>something <em>together.</em></h2>
        <div class="links reveal">${links.map(([l, h]) => `<a class="btn ghost" href="${esc(h)}" target="_blank" rel="noopener">${l}</a>`).join("")}</div>
      </section>` : ""}
      <footer>Woven with <b>Gitloom</b> from public GitHub data</footer>
    `;

    // count-up
    document.querySelectorAll(".count").forEach(el => {
      const n = +el.dataset.n, t0 = performance.now();
      (function tick(t) {
        const k = Math.min((t - t0) / 1300, 1);
        el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
    // typing
    const ty = document.querySelector(".type");
    if (ty) { const s = ty.dataset.text; let i = 0; (function step() { ty.textContent = s.slice(0, ++i); if (i < s.length) setTimeout(step, 38); })(); }

    initFx();
  }

  function showError(msg) {
    document.getElementById("app").innerHTML = `<div class="err"><h1>${esc(msg)}</h1><a class="btn" href="index.html">← Back</a></div>`;
  }

  async function exportSite() {
    const css = await (await fetch("css/portfolio.css")).text();
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll(".toolbar,script,link[href='css/portfolio.css']").forEach(e => e.remove());
    clone.querySelectorAll(".count").forEach(e => { e.textContent = e.dataset.n; });
    clone.querySelectorAll(".type").forEach(e => { e.textContent = e.dataset.text; });
    clone.querySelectorAll(".in").forEach(e => e.classList.remove("in"));
    clone.querySelectorAll(".glow").forEach(e => e.removeAttribute("style"));
    clone.querySelector(".progress").removeAttribute("style");
    clone.querySelector("body").setAttribute("style", "");
    const style = document.createElement("style");
    style.textContent = `:root{--ac:${P.a}}` + css;
    clone.querySelector("head").appendChild(style);
    const sc = document.createElement("script");
    sc.textContent = `(${initFx.toString()})()`;
    clone.querySelector("body").appendChild(sc);
    const html = "<!DOCTYPE html>\n" + clone.outerHTML;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `${P.user}-portfolio.html`;
    a.click();
  }

  document.getElementById("copy").onclick = async e => {
    await navigator.clipboard.writeText(location.href);
    e.target.textContent = "Copied!";
    setTimeout(() => (e.target.textContent = "Copy link"), 1500);
  };
  document.getElementById("export").onclick = () => exportSite();

  if (!P.user) { showError("No username given."); return; }
  GL.load(P.user).then(render).catch(err => {
    if (err.message === "not_found") showError(`No GitHub user "${P.user}".`);
    else if (err.message === "rate_limit") showError("GitHub rate limit hit. Try again in a while.");
    else showError("Something went wrong. Check your internet.");
  });
})();