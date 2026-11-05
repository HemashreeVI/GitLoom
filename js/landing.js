/* GitLoom landing: the loom, the forms, the live template gallery. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Sticky nav ----------
  const nav = document.getElementById("nav");
  addEventListener("scroll", () => nav.classList.toggle("stuck", scrollY > 10), { passive: true });

  // ---------- Username forms ----------
  const clean = v => v.trim().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "").replace(/[/?#].*$/, "");
  const valid = v => /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(v);
  document.querySelectorAll("form.weave").forEach(f => f.addEventListener("submit", e => {
    e.preventDefault();
    const input = f.querySelector("input");
    const u = clean(input.value);
    if (!valid(u)) {
      f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
      input.focus(); input.setAttribute("aria-invalid", "true");
      return;
    }
    location.href = "studio.html?user=" + encodeURIComponent(u);
  }));

  // ---------- The loom ----------
  // Warp threads hang vertically. Every character typed in the hero field shuttles a weft row across,
  // in a 2/2 twill so the cloth shows diagonal ribs. The pointer gently parts the warp.
  const cv = document.getElementById("loom");
  const ctx = cv.getContext("2d");
  const WEFT = ["#3b5bdb", "#e3a72f", "#c8323c", "#5c8a3a", "#191c3a", "#8aa2f0", "#e98a8f", "#3b5bdb", "#e3a72f"];
  const WARP = "#cfd3df";
  const GAP = 20, ROW = 17, TW = 12, WW = 15;
  let W = 0, H = 0, dpr = 1, cols = 0, capacity = 0;
  let rows = [];          // { c: colour, t0: start time, dir: 1|-1 }
  let px = -9999, py = -9999, pAmp = 0, pTarget = 0;
  let raf = 0, lastActive = 0;
  const seed = "gitloom weaves your github into a website";

  function size() {
    const r = cv.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / GAP) + 1;
    capacity = Math.floor((H - 40) / ROW);
    kick();
  }
  const colourFor = (ch, i) => WEFT[(ch.charCodeAt(0) * 7 + i * 3) % WEFT.length];

  function initRows() {
    const n = Math.floor(capacity * 0.58);
    rows = Array.from({ length: n }, (_, i) => ({ c: colourFor(seed[i % seed.length], i), t0: reduce ? -1e9 : performance.now() + i * 55, dir: i % 2 ? -1 : 1 }));
  }
  let typed = 0;
  function syncTyped(len) {
    const now = performance.now();
    const base = Math.floor(capacity * 0.58);
    while (typed < len) { rows.push({ c: colourFor(input.value[typed] || "a", base + typed), t0: reduce ? -1e9 : now, dir: (base + typed) % 2 ? -1 : 1 }); typed++; }
    while (typed > len) { rows.pop(); typed--; }
    kick();
  }

  // Horizontal displacement of warp j at height y, from the pointer.
  function wx(j, y) {
    const x = j * GAP + GAP / 2;
    if (pAmp < 0.01) return x;
    const dx = x - px, dy = y - py;
    const f = Math.exp(-(dx * dx + dy * dy) / (2 * 90 * 90));
    return x + Math.sign(dx || 1) * f * 26 * pAmp;
  }

  function thread(x1, y1, x2, y2, colour) {
    ctx.strokeStyle = colour; ctx.lineWidth = WW; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    pAmp += (pTarget - pAmp) * 0.12;
    const visible = rows.slice(-capacity);
    const shift = rows.length - visible.length;
    const bottom = H - 30;

    // Warp: full-height polylines
    ctx.lineCap = "round";
    for (let j = 0; j < cols; j++) {
      ctx.strokeStyle = WARP; ctx.lineWidth = TW;
      ctx.beginPath();
      for (let y = -10; y <= H + 10; y += 14) { const x = wx(j, y); y === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = -10; y <= H + 10; y += 14) { const x = wx(j, y) - 3; y === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }

    let busy = pAmp > 0.01 && Math.abs(pTarget - pAmp) > 0.005;
    visible.forEach((r, i) => {
      const idx = i + shift;
      const y = bottom - i * ROW;
      const k = Math.max(0, Math.min(1, (now - r.t0) / 520));
      if (k < 1) busy = true;
      if (k <= 0) return;
      const e = 1 - Math.pow(1 - k, 3);
      const span = W + 40;
      const xa = r.dir > 0 ? -20 : W + 20;
      const xb = xa + r.dir * span * e;
      thread(xa, y, xb, y, r.c);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xa, y - 4); ctx.lineTo(xb, y - 4); ctx.stroke();
      // Warp floats over the weft where the twill says so
      for (let j = 0; j < cols; j++) {
        if ((j + idx) % 4 >= 2) continue;
        const x = wx(j, y);
        if (r.dir > 0 ? x > xb : x < xb) continue;
        ctx.strokeStyle = WARP; ctx.lineWidth = TW; ctx.lineCap = "butt";
        ctx.beginPath(); ctx.moveTo(wx(j, y - ROW / 2 - 1), y - ROW / 2 - 1); ctx.lineTo(wx(j, y + ROW / 2 + 1), y + ROW / 2 + 1); ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx(j, y - ROW / 2) - 3, y - ROW / 2); ctx.lineTo(wx(j, y + ROW / 2) - 3, y + ROW / 2); ctx.stroke();
        ctx.lineCap = "round";
      }
      // The shuttle
      if (k < 1) {
        ctx.fillStyle = "#191c3a";
        ctx.beginPath(); ctx.ellipse(xb, y, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
    // Soft shading so the cloth feels dense at the bottom
    const g = ctx.createLinearGradient(0, H * .2, 0, H);
    g.addColorStop(0, "rgba(25,28,58,0)"); g.addColorStop(1, "rgba(25,28,58,.10)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    if (busy || now - lastActive < 400) raf = requestAnimationFrame(draw);
    else raf = 0;
  }
  function kick() { lastActive = performance.now(); if (!raf) raf = requestAnimationFrame(draw); }

  const input = document.getElementById("heroUser");
  input.addEventListener("input", () => { input.removeAttribute("aria-invalid"); syncTyped(Math.min(input.value.length, 39)); });
  if (!reduce && matchMedia("(pointer: fine)").matches) {
    const hero = document.querySelector(".hero");
    hero.addEventListener("pointermove", e => { const r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; pTarget = 1; kick(); });
    hero.addEventListener("pointerleave", () => { pTarget = 0; kick(); });
  }
  new ResizeObserver(() => { const had = rows.length; size(); if (!had) initRows(); kick(); }).observe(cv);

  // ---------- Template gallery (live, lazy) ----------
  const gal = document.getElementById("gallery");
  const sections = ["about", "projects", "languages", "activity", "skills", "contact"];
  gal.innerHTML = GLC.TEMPLATES.map(t => {
    const c = GLC.encode({ user: "__demo", t: t.id, a: t.accent, motion: false, avail: true, sections, skills: ["PyTorch", "OpenCV", "ROS 2", "ESP32"], em: "mira@example.com" });
    return `<a class="shot" href="studio.html?t=${t.id}" data-src="portfolio.html?embed=1&demo=1#c=${c}" aria-label="Open the ${t.name} template in the studio">
      <div class="shot-frame"><div class="ph">Loading preview</div></div>
      <div class="shot-meta"><div><h3>${t.name}</h3><p>${t.note}</p></div><span class="use">Use this template</span></div>
    </a>`;
  }).join("");

  // Carry a username typed in the hero into the template links.
  gal.addEventListener("click", e => {
    const a = e.target.closest(".shot"); if (!a) return;
    const u = clean(input.value);
    if (valid(u)) { e.preventDefault(); location.href = a.getAttribute("href") + "&user=" + encodeURIComponent(u); }
  });

  function fit(frame) {
    const ifr = frame.querySelector("iframe");
    if (ifr) ifr.style.transform = `scale(${frame.clientWidth / 1440})`;
  }
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const frame = en.target.querySelector(".shot-frame");
    const ifr = document.createElement("iframe");
    ifr.src = en.target.dataset.src; ifr.loading = "lazy"; ifr.tabIndex = -1; ifr.title = "";
    ifr.setAttribute("aria-hidden", "true");
    ifr.addEventListener("load", () => { const ph = frame.querySelector(".ph"); if (ph) setTimeout(() => ph.remove(), 400); });
    frame.appendChild(ifr); fit(frame);
  }), { root: null, rootMargin: "200px 400px" });
  gal.querySelectorAll(".shot").forEach(s => io.observe(s));
  new ResizeObserver(() => gal.querySelectorAll(".shot-frame").forEach(fit)).observe(gal);

  document.querySelectorAll(".gallery-nav .round").forEach(b => b.addEventListener("click", () => {
    const card = gal.querySelector(".shot");
    gal.scrollBy({ left: +b.dataset.dir * (card.clientWidth + 22) * 2, behavior: reduce ? "auto" : "smooth" });
  }));
})();
