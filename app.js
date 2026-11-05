const form = document.getElementById("weave-form");
const input = document.getElementById("username");
const status = document.getElementById("status");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = input.value.trim().replace(/^@/, "");
  status.textContent = `Weaving @${username}… (data fetching comes next)`;
});