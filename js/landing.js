const form = document.getElementById("form");
const accent = document.getElementById("accent");
const sunsw = document.getElementById("sunsw");

document.querySelectorAll(".colors button").forEach(b => {
  b.addEventListener("click", () => { accent.value = b.dataset.c; sunsw.style.background = b.dataset.c; });
});
accent.addEventListener("input", () => { sunsw.style.background = accent.value; });

form.addEventListener("submit", e => {
  e.preventDefault();
  const d = new FormData(form);
  const p = new URLSearchParams();
  p.set("user", (d.get("user") || "").trim().replace(/^@/, ""));
  p.set("t", d.get("t"));
  p.set("a", d.get("a"));
  ["hl", "em", "li", "x", "web"].forEach(k => {
    const v = (d.get(k) || "").trim();
    if (v) p.set(k, v);
  });
  p.set("show", d.getAll("show").join(",") || "about");
  p.set("photo", d.get("photo") ? "1" : "0");
  location.href = "portfolio.html?" + p.toString();
});