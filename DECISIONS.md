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

_Date: 2026-05-06_ _(data shape updated — see also "User Management, Entry Attribution, and Pick History" below)_

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

## Sidebar Tabbed Navigation

_Date: 2026-05-06_

**Replaced stacked sidebar sections with a tab-based interface (Topics / Users)**  
Rationale: The previous layout stacked the Topics and Users panels vertically within a fixed-width sidebar. When both panels had content the Users section would overlap or compress the Topics list, making the UI confusing. A tab interface shows one panel at a time, eliminates the overlap issue, and gives each panel the full vertical space of the sidebar. Tabs use ARIA `role="tablist"` / `role="tab"` / `role="tabpanel"` for accessibility.

## Fair Mode Checkbox Theming

_Date: 2026-05-08_

**Replaced the native browser checkbox on the "Fair mode" toggle with a custom circular indicator styled to match the application theme.**

Rationale: The default browser checkbox rendered as a grey square that clashed with the app's rounded, colourful aesthetic. The custom indicator uses a CSS-only approach: the native `<input type="checkbox">` is visually hidden (but remains in the DOM for accessibility and keyboard navigation), and a sibling `<span class="fair-mode-indicator">` is styled as a circle using `border-radius: 50%`. Unchecked state shows a white circle with a blue border; checked state shows a solid blue circle with a white checkmark and an orange glow ring (using `var(--clr-accent-glow)`, a new semi-transparent variant of `--clr-accent` added to `:root`), consistent with the app's blue/orange colour palette. Focus-visible and disabled states are also handled.

## Fair Mode (Pseudo-Random Selection)

_Date: 2026-05-07_

**Added per-topic "Fair mode" toggle that ensures each user is selected before any user is repeated.**

Rationale: Pure random selection can lead to unfair distribution in small groups — one user may be picked repeatedly while others are skipped. Fair mode addresses this by tracking which users have already been picked in the current round. Entries attributed to already-picked users are excluded from the candidate pool until every user with entries in the topic has been selected. Once all users have been picked, the round resets automatically.

Implementation details:
- Each topic stores `fairMode` (boolean) and `fairModePickedUserIds` (array of user IDs already picked this round).
- Entries with no user attribution (`userId: null`) are always eligible regardless of fair mode state.
- The round resets when all distinct user IDs present in the topic's entries have been picked.
- Toggling fair mode off clears the tracking array.
- State is persisted in localStorage alongside existing topic data.

## Responsive Add-Entry / Add-User / Add-Topic Forms

_Date: 2026-05-07_

Made the add-entry form (`.add-entry-form`) and the sidebar input rows (`.input-row`) wrap on narrow viewports so the **Add** button is never pushed off-screen on mobile. Specifically, `flex-wrap: wrap` is enabled on both rows; `.input-field` uses `flex: 1 1 120px` with `min-width: 0` so inputs can shrink and reflow instead of overflowing; and on viewports ≤ 480px the entry form's submit button stretches to full width on its own row for an easier mobile tap target. Rationale: the previous fixed single-row flex layout assumed enough horizontal space for input + user-select + button, which fails on phone-width screens. Wrapping is preferred over horizontal scrolling for accessibility and usability.
