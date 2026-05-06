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

Data shape (v2):
```json
{
  "topics": {
    "TopicName": {
      "entries": [
        { "text": "entry1", "userId": "abc123" },
        { "text": "entry2", "userId": null }
      ],
      "picks": [
        { "text": "entry1", "userId": "abc123", "timestamp": 1746527000000 }
      ]
    }
  },
  "users": [
    { "id": "abc123", "name": "Alice", "colour": "#7c3aed" }
  ]
}
```

On load, v1 data (topics as plain string arrays) is automatically migrated to the v2 shape: each string becomes `{ text, userId: null }` and an empty `picks` array is added.

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

## Standard Repository Metadata Files

_Date: 2026-05-06_

Added `.gitignore`, `.gitattributes`, and `.editorconfig` to the repository. `.gitignore` excludes OS-generated files (`.DS_Store`, `Thumbs.db`), editor/IDE artifacts, and log files. `.gitattributes` enforces consistent line endings, marks files as text where appropriate, and enables built-in language-aware diff drivers for HTML, CSS, and Markdown. `.editorconfig` standardises basic formatting (UTF-8, LF line endings, 2-space indentation) across editors. These files are standard for collaborative repositories and reduce accidental noise in commits.

## Automated GitHub Pages Deployment via GitHub Actions

_Date: 2026-05-05_

A GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically deploys the site to GitHub Pages on every push to `main`. The workflow uses the official `actions/deploy-pages` action with the newer "GitHub Actions" Pages source (Settings → Pages → Source → **GitHub Actions**). This ensures the live site stays in sync with the latest code on `main` without manual intervention. Only the public site assets (`index.html`, `css/`, `js/`) are included in the deployment artifact to avoid exposing internal files. Concurrent deployments are queued and run sequentially to ensure every push is deployed.

## User Management, Entry Attribution, and Pick History

_Date: 2026-05-06_

Three related features were added together as they share data-structure concerns:

1. **User addition** – A Users panel in the sidebar lets users create named entries with an associated hex colour (via `<input type="color">`). Users are stored in `state.users` as `{ id, name, colour }` objects. IDs are generated with `crypto.randomUUID()` (available in all modern browsers), providing strong uniqueness guarantees.

2. **Entry attribution** – Entries are now stored as `{ text, userId }` objects instead of plain strings. When any users exist, a dropdown appears in the "Add entry" form so the submitter can optionally attribute the entry to a user. Deleting a user leaves existing entries and picks intact; the attribution is simply hidden in the UI (graceful degradation).

3. **Selection memory** – Each time the picker settles on a winner, `recordPick` appends `{ text, userId, timestamp }` to the topic's `picks` array. A "Pick History" card in the topic view renders these records newest-first, showing the entry text, user colour dot + name (if attributed), and a locale-formatted timestamp.

4. **Data migration** – `Storage.migrate` handles v1 data (topics stored as string arrays) transparently on load, so existing data is preserved without any manual user action.
