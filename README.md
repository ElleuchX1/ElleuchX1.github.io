# elleu.ch

Personal security-researcher site. **Astro** (static), monospace/terminal-minimal:
three colors per theme (paper, ink, one green accent), compact layout, light + dark.

## Features
- **Posts / Notes / Tools** collections (Markdown), original URLs preserved
- **Tags** — clickable tags, `/tags/` index and `/tags/:tag/` pages
- **Search** — Pagefind, styled to match; press `/` anywhere to jump to it
- **Light/Dark** toggle (system-aware, persisted), no flash
- **Per-post OG images** generated at build (sharp → PNG)
- **Self-hosted font** (JetBrains Mono via `@fontsource-variable`)
- RSS, sitemap, `robots.txt`, `/.well-known/security.txt`, 404, reading progress, prev/next, back-to-top

## Develop
```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # astro build + pagefind index -> dist/
npm run preview
```

## Content
Add a Markdown file to `src/content/{posts,notes,tools}/`:
```md
---
title: My title
date: 2026-01-20
summary: One line shown in lists.
tags: [web, ctf]
---
Body…
```
Filename becomes the URL (`htb-atom.md` → `/posts/htb-atom/`); case is preserved.

### Images
`scripts/imgproc.cjs` resizes/encodes images to WebP and rewrites refs.
`scripts/imgrefs.cjs` normalizes remaining refs and adds `alt`/`lazy` to `<img>`.
Run them after copying new images into `public/assets/img/`.

## Deploy
Static `dist/`. Target: GitHub Pages + custom domain `elleu.ch`.
Security headers (CSP, HSTS, …) must be set at the edge — front the Pages origin with Cloudflare.
