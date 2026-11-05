/* GitLoom — fictional demo profile used for template previews and "Try the demo". No network needed. */
window.GLDemo = (() => {
  const now = Date.now();
  const ago = d => new Date(now - d * 864e5).toISOString();
  const avatar = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b5bdb"/><stop offset="1" stop-color="#c8323c"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><g stroke="#fff" stroke-opacity=".18" stroke-width="6">${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 25}" y1="0" x2="${i * 25}" y2="200"/>`).join("")}</g><text x="100" y="128" font-family="Georgia,serif" font-size="88" text-anchor="middle" fill="#fff">MO</text></svg>`);

  const R = (name, description, language, stars, forks, days, topics = [], homepage = "") => ({
    name, description, language, stargazers_count: stars, forks_count: forks, pushed_at: ago(days),
    html_url: "https://github.com/mira-demo/" + name, homepage, topics, fork: false, archived: false, default_branch: "main"
  });

  const repos = [
    R("loomlight", "Real-time textile defect detection on a Raspberry Pi with a tiny CNN.", "Python", 412, 38, 2, ["computer-vision", "edge-ai", "pytorch"], "https://example.com"),
    R("pocket-lidar", "ESP32 + VL53L1X sweep scanner that streams point clouds over Wi-Fi.", "C++", 268, 21, 6, ["esp32", "robotics", "lidar"]),
    R("notebook-to-api", "Turn a Jupyter notebook into a typed FastAPI service in one command.", "Python", 190, 17, 11, ["fastapi", "mlops"]),
    R("tiny-transformer", "A 300-line transformer you can read on a train ride. Trains on Shakespeare.", "Python", 154, 22, 19, ["nlp", "education"]),
    R("signal-garden", "Interactive DSP playground: draw a filter, hear the result.", "TypeScript", 97, 8, 25, ["webaudio", "dsp"], "https://example.com"),
    R("rover-os", "ROS 2 launch files and nav stack tuning for a 4WD indoor rover.", "C++", 71, 9, 33, ["ros2", "slam"]),
    R("crypto-notes", "Worked examples for classical and modern ciphers, with tests.", "Rust", 48, 5, 41, ["cryptography"]),
    R("habit-weave", "Offline-first habit tracker built with SvelteKit and IndexedDB.", "Svelte", 33, 3, 52, ["pwa"]),
    R("dataset-doctor", "Finds label noise and leakage in tabular ML datasets.", "Python", 29, 2, 60, ["data-science"]),
    R("kicad-macros", "Footprints and scripts I reuse across PCB projects.", "Python", 14, 1, 75, ["pcb", "hardware"]),
    R("dotfiles", "Terminal, editor and window-manager config.", "Shell", 6, 0, 90),
    R("go-ratelimit", "Token-bucket middleware with Redis backing.", "Go", 11, 1, 110, ["backend"])
  ];

  const events = [];
  const pick = i => repos[i % 6].name;
  for (let d = 0; d < 90; d++) {
    const n = (Math.sin(d * 1.7) + Math.cos(d * 0.6) + 2) * 1.4;
    for (let k = 0; k < Math.floor(n) % 4; k++) {
      events.push({ type: "PushEvent", created_at: new Date(now - d * 864e5 - k * 36e5).toISOString(), repo: { name: "mira-demo/" + pick(d + k) }, payload: { size: 1 + ((d + k) % 3) } });
    }
    if (d % 9 === 3) events.push({ type: "PullRequestEvent", created_at: ago(d), repo: { name: "pytorch/vision" }, payload: { action: "opened" } });
    if (d % 13 === 5) events.push({ type: "ReleaseEvent", created_at: ago(d), repo: { name: "mira-demo/" + pick(d) }, payload: {} });
  }
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    user: {
      login: "mira-demo", name: "Mira Okafor", avatar_url: avatar, html_url: "https://github.com/mira-demo",
      bio: "I build small machines that see, and the software that keeps them honest. Computer vision, embedded systems, and tools for people who tinker.",
      location: "Chennai, India", company: "Independent", blog: "", followers: 1284, following: 87,
      public_repos: repos.length, created_at: "2019-03-14T10:00:00Z"
    },
    repos,
    events,
    langBytes: { Python: 520000, "C++": 310000, TypeScript: 140000, Rust: 60000, Svelte: 40000, Go: 22000, Shell: 9000 },
    readme: {
      base: "",
      text: "### Hi, I'm Mira\n\nI'm currently working on **loomlight**, a defect detector that runs on a $35 board.\n\n- Learning: ROS 2 navigation and SLAM\n- Writing: notes on [quantization for tiny models](https://example.com)\n- Ask me about: ESP32, PyTorch, PCB design\n\n> Ship the rough version, then make it good."
    }
  };
})();
