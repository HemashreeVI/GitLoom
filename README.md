# GitLoom

**Your GitHub, woven into a website.**

Paste a GitHub username and GitLoom turns your public profile into a portfolio site. Style it in a live studio, pick from ten templates, then download one `index.html` you can host free on GitHub Pages, Netlify or Vercel.

No sign-up, no server, no build step. Everything runs in the browser.

## Features

### Pulled from GitHub
- **Projects** with stars, forks, topics, live-site links and "updated 3 days ago"
- **Languages** measured by bytes of code across your top repos, shown as a ring chart and bars
- **Activity** heatmap and feed from your last 90 days of public events
- **Profile README** (the `username/username` repo) rendered with a strict sanitizer
- Pagination up to 300 repos, 30-minute cache, clear messages for typos and rate limits

### Studio (`studio.html`)
- **Live preview** in desktop, tablet and phone sizes
- **10 templates**: Editorial, Midnight, Sunrise, Terminal, Bento, Brutalist, Swiss, Aurora, Blueprint, Zen
- **Any accent colour** plus 15 presets, with readable text colour picked automatically
- **9 headline fonts**
- **Drag-to-reorder sections**: About, Profile README, Projects, Languages, Activity, Experience, Skills, Contact
- **Pick repos by hand** and drag their order, or sort automatically by stars, recency or name
- **Experience timeline** and **skills** you add yourself
- **Availability badge**, résumé link, email, LinkedIn, X, website
- **Undo / redo** (Ctrl+Z, Ctrl+Shift+Z), autosaved drafts, **saved designs**, import/export settings as JSON
- Optional **GitHub token** (stored only in your browser) to raise the API limit from 60 to 5,000 requests an hour

### The generated site
- One self-contained `index.html`: styles and script inlined
- SEO and social tags (Open Graph, Twitter card, JSON-LD `Person`), avatar favicon
- **Ctrl+K quick menu** to jump to sections, open projects, copy email
- Project **filter by language** and **search**
- **Print / Save as PDF** gives a clean one-colour résumé in any template
- Phone layouts, keyboard focus styles, `prefers-reduced-motion` respected, animation off switch
- **Share links**: the whole design is encoded in the URL (`portfolio.html#c=…`) and rebuilds from live data

## Project structure

```text
GitLoom/
├── index.html          Landing page (live loom hero + template gallery)
├── studio.html         The builder
├── portfolio.html      Renders a portfolio from a config (also used for previews)
├── css/
│   ├── landing.css
│   ├── studio.css
│   └── portfolio.css   Shared base + all 10 templates + print styles
└── js/
    ├── config.js       Templates, fonts, sections, defaults, URL encode/decode
    ├── github.js       GitHub API, caching, analysis
    ├── render.js       Builds the portfolio HTML (one markup, every template)
    ├── demo.js         Fictional demo profile, works offline
    ├── portfolio.js    Effects runtime, export, studio messaging
    ├── studio.js       Studio controls, undo/redo, presets
    └── landing.js      Loom animation, gallery
```

## Run it locally

```bash
git clone https://github.com/HemashreeVI/GitLoom.git
cd GitLoom
```

Open the folder in VS Code and start **Live Server** (right-click `index.html` → *Open with Live Server*).
A local server is needed for **Download site**, because the export reads `css/portfolio.css`.

## Publish your portfolio

1. In the studio, click **Download site** to get `index.html`.
2. Create a repository named `your-username.github.io`.
3. Upload `index.html`, then open **Settings → Pages** and choose the `main` branch.
4. Your site is live at `https://your-username.github.io`.

## Add a template

1. Add an entry to `TEMPLATES` in `js/config.js` (`id`, `name`, `note`, `accent`).
2. Add a `body[data-t="your-id"] { … }` block in `css/portfolio.css`. Set the variables
   (`--bg --fg --mut --line --card --card-b --fd --fb --r --hd-w --hd-ls`) and override any component.
3. Add a `.mini[data-t="your-id"]` thumbnail in `css/studio.css`.

## Tech

HTML, CSS and vanilla JavaScript. GitHub REST API. [marked](https://github.com/markedjs/marked) for README rendering (falls back to a built-in parser). Google Fonts.

## Author

**Hemashree V. I.** · [@HemashreeVI](https://github.com/HemashreeVI)
