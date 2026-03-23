# AI Life Coverage

Track every AI Life OS section, component status, and whether the integration spine (daily brief, evening reflection, weekly report, decision engine) has coverage.

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## GitHub Pages

The repo includes [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). After the first push to `main`:

1. Open **Settings → Pages** on GitHub.
2. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).

The workflow builds with `GITHUB_PAGES_BASE=/ai-life/` so assets load correctly at:

**https://hondoentertainment.github.io/ai-life/**

(If you rename the repository, the workflow uses `github.event.repository.name` automatically; the site URL path matches the repo name.)

## Tech stack

React 19, TypeScript, Vite 8.
