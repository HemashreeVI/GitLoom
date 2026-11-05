window.GL = (() => {
  const API = "https://api.github.com/users/";

  async function get(url) {
    const key = "gl:" + url;
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached);
    const res = await fetch(url);
    if (res.status === 404) throw new Error("not_found");
    if (res.status === 403 || res.status === 429) throw new Error("rate_limit");
    if (!res.ok) throw new Error("http");
    const json = await res.json();
    try { sessionStorage.setItem(key, JSON.stringify(json)); } catch (e) {}
    return json;
  }

  async function load(username) {
    const [user, repos] = await Promise.all([
      get(API + encodeURIComponent(username)),
      get(API + encodeURIComponent(username) + "/repos?per_page=100&sort=pushed")
    ]);
    return { user, repos };
  }

  function analyse(repos) {
    const own = repos.filter(r => !r.fork);
    const stars = own.reduce((s, r) => s + r.stargazers_count, 0);
    const counts = {};
    own.forEach(r => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const languages = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([name, n]) => ({ name, pct: Math.max(1, Math.round(n / total * 100)) }));
    const top = [...own]
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 9);
    return { own, stars, languages, top };
  }

  const esc = t => { const d = document.createElement("div"); d.textContent = t == null ? "" : t; return d.innerHTML; };

  return { load, analyse, esc };
})();