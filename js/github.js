/* GitLoom — GitHub data layer. Public REST API, optional personal token, 30-minute cache. */
window.GL = (() => {
  const API = "https://api.github.com";
  const TTL = 30 * 60 * 1000;

  const token = () => { try { return localStorage.getItem("gl:token") || ""; } catch (e) { return ""; } };

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem("gl:c:" + key);
      if (!raw) return undefined;
      const { t, v } = JSON.parse(raw);
      if (Date.now() - t > TTL) return undefined;
      return v;
    } catch (e) { return undefined; }
  }
  function cacheSet(key, v) {
    try { localStorage.setItem("gl:c:" + key, JSON.stringify({ t: Date.now(), v })); }
    catch (e) { // storage full: drop old GitLoom cache entries and give up quietly
      try { Object.keys(localStorage).filter(k => k.startsWith("gl:c:")).forEach(k => localStorage.removeItem(k)); } catch (_) {}
    }
  }
  function clearCache() {
    try { Object.keys(localStorage).filter(k => k.startsWith("gl:c:")).forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }

  async function getJSON(path, { optional = false } = {}) {
    const hit = cacheGet(path);
    if (hit !== undefined) return hit;
    const headers = { Accept: "application/vnd.github+json" };
    const tk = token();
    if (tk) headers.Authorization = "Bearer " + tk;
    const res = await fetch(API + path, { headers });
    if (res.status === 404) { if (optional) { cacheSet(path, null); return null; } throw new Error("not_found"); }
    if (res.status === 401) throw new Error("bad_token");
    if (res.status === 403 || res.status === 429) { if (optional) return null; throw new Error("rate_limit"); }
    if (!res.ok) { if (optional) return null; throw new Error("http"); }
    const json = await res.json();
    cacheSet(path, json);
    return json;
  }

  async function getText(url) {
    const hit = cacheGet(url);
    if (hit !== undefined) return hit;
    try {
      const res = await fetch(url);
      const v = res.ok ? await res.text() : null;
      cacheSet(url, v);
      return v;
    } catch (e) { return null; }
  }

  async function load(username) {
    if (username === "__demo" && window.GLDemo) return JSON.parse(JSON.stringify(window.GLDemo));
    const u = encodeURIComponent(username);
    const user = await getJSON(`/users/${u}`);
    const pages = Math.min(3, Math.ceil((user.public_repos || 1) / 100));
    const repoPages = await Promise.all(
      Array.from({ length: pages }, (_, i) => getJSON(`/users/${u}/repos?per_page=100&sort=pushed&page=${i + 1}`))
    );
    const repos = repoPages.flat();
    const events = (await getJSON(`/users/${u}/events/public?per_page=100`, { optional: true })) || [];

    // Profile README lives in the repo named after the user.
    let readme = null;
    const special = repos.find(r => r.name.toLowerCase() === user.login.toLowerCase());
    if (special) {
      const branch = special.default_branch || "main";
      readme = await getText(`https://raw.githubusercontent.com/${user.login}/${special.name}/${branch}/README.md`);
      if (readme) readme = { text: readme, base: `https://raw.githubusercontent.com/${user.login}/${special.name}/${branch}/` };
    }

    // Language bytes for the 10 most relevant own repos (more accurate than "one language per repo").
    const own = repos.filter(r => !r.fork && !r.archived)
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 10);
    const langList = await Promise.all(own.map(r => getJSON(`/repos/${user.login}/${encodeURIComponent(r.name)}/languages`, { optional: true })));
    const langBytes = {};
    langList.forEach(m => { if (m) Object.entries(m).forEach(([k, v]) => (langBytes[k] = (langBytes[k] || 0) + v)); });

    return { user, repos, events, readme, langBytes };
  }

  // Turns raw data + config into everything the templates need.
  function analyse(data, cfg) {
    const { user, repos, events, langBytes } = data;
    let pool = repos.filter(r => r.name.toLowerCase() !== user.login.toLowerCase());
    if (!cfg.forks) pool = pool.filter(r => !r.fork);
    if (!cfg.archived) pool = pool.filter(r => !r.archived);

    const sorters = {
      stars: (a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at),
      recent: (a, b) => new Date(b.pushed_at) - new Date(a.pushed_at),
      name: (a, b) => a.name.localeCompare(b.name)
    };
    const sorted = [...pool].sort(sorters[cfg.sort] || sorters.stars);
    let top;
    if (cfg.featured && cfg.featured.length) {
      const byName = new Map(repos.map(r => [r.name, r]));
      top = cfg.featured.map(n => byName.get(n)).filter(Boolean);
    } else {
      top = sorted.slice(0, cfg.max);
    }

    const ownAll = repos.filter(r => !r.fork);
    const stars = ownAll.reduce((s, r) => s + r.stargazers_count, 0);
    const forks = ownAll.reduce((s, r) => s + r.forks_count, 0);

    let langEntries = Object.entries(langBytes || {});
    if (!langEntries.length) {
      const counts = {};
      ownAll.forEach(r => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
      langEntries = Object.entries(counts);
    }
    const total = langEntries.reduce((s, [, n]) => s + n, 0) || 1;
    let languages = langEntries.sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, pct: (n / total) * 100 }));
    if (languages.length > 7) {
      const rest = languages.slice(7).reduce((s, l) => s + l.pct, 0);
      languages = languages.slice(0, 7);
      if (rest >= 0.5) languages.push({ name: "Other", pct: rest });
    }

    // Activity: daily counts for the last 13 weeks + a short feed.
    const days = {};
    (events || []).forEach(e => {
      const d = e.created_at.slice(0, 10);
      const w = e.type === "PushEvent" ? Math.max(1, (e.payload && e.payload.size) || 1) : 1;
      days[d] = (days[d] || 0) + w;
    });
    const feed = (events || []).map(describeEvent).filter(Boolean).slice(0, 6);

    const years = Math.max(1, new Date().getFullYear() - new Date(user.created_at).getFullYear());
    return { pool: sorted, top, stars, forks, languages, days, feed, years, ownCount: ownAll.length };
  }

  function describeEvent(e) {
    const repo = e.repo && e.repo.name;
    const at = e.created_at;
    const url = repo ? "https://github.com/" + repo : "";
    switch (e.type) {
      case "PushEvent": { const n = (e.payload && e.payload.size) || 1; return { at, url, verb: `Pushed ${n} commit${n > 1 ? "s" : ""} to`, repo }; }
      case "CreateEvent": return e.payload && e.payload.ref_type === "repository" ? { at, url, verb: "Created", repo } : null;
      case "PullRequestEvent": return { at, url, verb: e.payload && e.payload.action === "closed" ? "Closed a pull request in" : "Opened a pull request in", repo };
      case "IssuesEvent": return { at, url, verb: "Opened an issue in", repo };
      case "WatchEvent": return { at, url, verb: "Starred", repo };
      case "ReleaseEvent": return { at, url, verb: "Published a release of", repo };
      case "ForkEvent": return { at, url, verb: "Forked", repo };
      default: return null;
    }
  }

  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  return { load, analyse, esc, clearCache, token };
})();
