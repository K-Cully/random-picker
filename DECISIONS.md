# Key Decisions – Random Picker

## Technology Stack

**Vanilla HTML/CSS/JavaScript (no framework, no build step)**  
Rationale: The requirements ask for an app that "runs in any modern browser" and is "runnable from GH in some way (pages/direct load)". A framework like React or Vue would require a build pipeline, making direct loading from a file URL or GitHub Pages more complex. Pure HTML/CSS/JS files can be opened directly in any browser or served statically without configuration.

## File Structure

```
index.html       – app shell (markup only, no inline scripts or styles)
css/styles.css   – all visual styling
js/app.js        – all application logic
README.md        – user-facing documentation
DECISIONS.md     – this file
```

Keeping CSS and JS in separate files respects the **separation of concerns** principle and makes individual pieces easier to read and maintain.

## Persistence: localStorage

All data is stored exclusively in `localStorage` under a single namespaced key (`randomPickerData`). No network requests are ever made, satisfying the requirements for local-only storage and no user data/telemetry collection.

Data shape:
```json
{
  "topics": {
    "TopicName": ["entry1", "entry2", "..."]
  }
}
```

## Random Selection

`Math.random()` is used for selection. This is a pseudo-random number generator (PRNG) and is suitable for a casual random picker. For a cryptographically strong selection `crypto.getRandomValues` could be used, but it adds complexity with no practical benefit for this use case.

An animated "spinning" phase cycles through random entries for 18–29 iterations before settling on a winner, giving the interaction a playful feel.

## Security

- All user-supplied strings rendered into HTML are escaped with a dedicated `escapeHtml` / `escapeAttr` helper to prevent XSS.
- No third-party scripts or stylesheets are loaded; all assets are local.
- No cookies, analytics, or tracking of any kind.
- The `font-family` stack (`'Inter', 'Segoe UI', system-ui, sans-serif`) means modern OS/browsers render a clean sans-serif font without any external requests.

## Accessibility

- Semantic HTML elements (`<header>`, `<aside>`, `<main>`, `<form>`, `<button>`).
- `aria-label` attributes on interactive controls.
- `aria-live="polite"` on the main content area so screen readers are notified of dynamic updates.
- Keyboard-navigable: all interactive elements are focusable; forms submit on Enter.

## ~~GitHub Pages Compatibility~~

> **Superseded on 2026-05-05** by "Automated GitHub Pages Deployment via GitHub Actions" below. The branch-based deployment method described here is no longer used; Pages is now deployed via a GitHub Actions workflow.

~~Because the app is a set of static files with no server-side logic, it can be published directly via **GitHub Pages** (Settings → Pages → Deploy from branch → `main` / root). The entry point is `index.html` at the repository root.~~

## Automated GitHub Pages Deployment via GitHub Actions

_Date: 2026-05-05_

A GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys the site to GitHub Pages on every push to `main`. The workflow uses the official `actions/deploy-pages` action with the newer "GitHub Actions" Pages source (Settings → Pages → Source → **GitHub Actions**). This ensures the live site stays in sync with the latest code on `main` without manual intervention. Only the public site assets (`index.html`, `css/`, `js/`) are included in the deployment artifact to avoid exposing internal files. Concurrent deployments are queued and run sequentially to ensure every push is deployed.
