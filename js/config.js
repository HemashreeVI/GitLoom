/* GitLoom — shared configuration: templates, fonts, sections, defaults, encode/decode.
   Loaded by index.html, studio.html and portfolio.html. */
window.GLC = (() => {
  const TEMPLATES = [
    { id: "editorial", name: "Editorial", note: "Paper, serif, hard shadows", accent: "#ff4d2e", dark: false },
    { id: "midnight", name: "Midnight", note: "Dark, glow, big type", accent: "#4de2f0", dark: true },
    { id: "sunrise", name: "Sunrise", note: "Full-colour hero, bold sans", accent: "#ff4d2e", dark: false },
    { id: "terminal", name: "Terminal", note: "Phosphor green shell", accent: "#33ff8a", dark: true },
    { id: "bento", name: "Bento", note: "Tiles in a product grid", accent: "#2f6fed", dark: false },
    { id: "brutalist", name: "Brutalist", note: "Thick rules, raw yellow", accent: "#ffe500", dark: false },
    { id: "swiss", name: "Swiss", note: "Strict grid, red rule", accent: "#e30613", dark: false },
    { id: "aurora", name: "Aurora", note: "Frosted glass on colour", accent: "#a78bfa", dark: true },
    { id: "blueprint", name: "Blueprint", note: "Drafting paper for makers", accent: "#ffd166", dark: true },
    { id: "zen", name: "Zen", note: "Quiet serif, wide margins", accent: "#5c7c5a", dark: false }
  ];

  const FONTS = [
    { id: "tpl", name: "Template default", css: "" },
    { id: "fraunces", name: "Fraunces", css: "'Fraunces', Georgia, serif" },
    { id: "dmserif", name: "DM Serif Display", css: "'DM Serif Display', Georgia, serif" },
    { id: "newsreader", name: "Newsreader", css: "'Newsreader', Georgia, serif" },
    { id: "grotesk", name: "Space Grotesk", css: "'Space Grotesk', system-ui, sans-serif" },
    { id: "syne", name: "Syne", css: "'Syne', system-ui, sans-serif" },
    { id: "manrope", name: "Manrope", css: "'Manrope', system-ui, sans-serif" },
    { id: "archivo", name: "Archivo Black", css: "'Archivo Black', Impact, sans-serif" },
    { id: "mono", name: "JetBrains Mono", css: "'JetBrains Mono', ui-monospace, monospace" }
  ];

  const SECTIONS = [
    { id: "about", name: "About" },
    { id: "readme", name: "Profile README" },
    { id: "projects", name: "Projects" },
    { id: "languages", name: "Languages" },
    { id: "activity", name: "Activity" },
    { id: "experience", name: "Experience" },
    { id: "skills", name: "Skills" },
    { id: "contact", name: "Contact" }
  ];

  const FONT_URL = "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@400;600;800&family=DM+Serif+Display&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Inter+Tight:wght@400;500;700;800&family=JetBrains+Mono:wght@400;500;700&family=Karla:wght@400;500;700&family=Manrope:wght@400;500;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Sora:wght@300;400;600;700&family=Space+Grotesk:wght@400;500;700&family=Syne:wght@600;700;800&display=swap";

  const defaults = () => ({
    v: 2,
    user: "",
    t: "editorial",
    a: "#ff4d2e",
    font: "tpl",
    hl: "", bio: "", loc: "",
    em: "", li: "", x: "", web: "", resume: "",
    avail: false, availText: "Open to internships",
    photo: true,
    sections: ["about", "projects", "languages", "activity", "contact"],
    sort: "stars", forks: false, archived: false, max: 9,
    featured: [],
    exp: [], skills: [],
    motion: true, credit: true, cmdk: true
  });

  // base64url <-> JSON (UTF-8 safe)
  function encode(cfg) {
    const bytes = new TextEncoder().encode(JSON.stringify(cfg));
    let s = ""; bytes.forEach(b => (s += String.fromCharCode(b)));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    try {
      const b = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = Uint8Array.from(b, c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }

  // Bring any (possibly hostile or old) object into a clean, valid config.
  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== "object") return d;
    const str = (v, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
    const c = { ...d };
    c.user = str(raw.user, 39).trim().replace(/^@/, "");
    c.t = TEMPLATES.some(t => t.id === raw.t) ? raw.t : d.t;
    c.a = /^#[0-9a-f]{6}$/i.test(raw.a || "") ? raw.a : (TEMPLATES.find(t => t.id === c.t) || {}).accent || d.a;
    c.font = FONTS.some(f => f.id === raw.font) ? raw.font : "tpl";
    ["hl", "loc", "em", "li", "x", "web", "resume", "availText"].forEach(k => { if (k in raw) c[k] = str(raw[k]).trim(); });
    c.bio = str(raw.bio, 800).trim();
    c.x = c.x.replace(/^@/, "");
    ["avail", "photo", "forks", "archived", "motion", "credit", "cmdk"].forEach(k => { if (k in raw) c[k] = !!raw[k]; });
    if (Array.isArray(raw.sections)) c.sections = raw.sections.filter(s => SECTIONS.some(x => x.id === s)).filter((s, i, a) => a.indexOf(s) === i);
    c.sort = ["stars", "recent", "name"].includes(raw.sort) ? raw.sort : "stars";
    c.max = Math.min(24, Math.max(3, parseInt(raw.max, 10) || 9));
    c.featured = Array.isArray(raw.featured) ? raw.featured.filter(x => typeof x === "string").slice(0, 24) : [];
    c.exp = Array.isArray(raw.exp) ? raw.exp.slice(0, 12).map(e => ({
      role: str(e && e.role, 80), org: str(e && e.org, 80), when: str(e && e.when, 40), desc: str(e && e.desc, 300)
    })) : [];
    c.skills = Array.isArray(raw.skills) ? raw.skills.filter(x => typeof x === "string" && x.trim()).map(x => x.trim().slice(0, 40)).slice(0, 40) : [];
    return c;
  }

  // Read config from the page URL. Supports new #c=… and the original ?user=&t=&a=… links.
  function fromLocation(loc = location) {
    const h = new URLSearchParams(loc.hash.slice(1));
    if (h.get("c")) return sanitize(decode(h.get("c")));
    const q = new URLSearchParams(loc.search);
    if (q.get("c")) return sanitize(decode(q.get("c")));
    if (q.get("user")) {
      const legacy = {
        user: q.get("user"), t: q.get("t"), a: q.get("a"), hl: q.get("hl"), em: q.get("em"),
        li: q.get("li"), x: q.get("x"), web: q.get("web"), photo: q.get("photo") !== "0"
      };
      if (q.get("show")) legacy.sections = q.get("show").split(",");
      return sanitize(legacy);
    }
    return null;
  }

  return { TEMPLATES, FONTS, SECTIONS, FONT_URL, defaults, encode, decode, sanitize, fromLocation };
})();
