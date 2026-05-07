# Copilot Custom Instructions – Random Picker

## Project Overview

Random Picker is a lightweight, browser-based single page application for random selection. Users create topics, add entries, and randomly pick a winner. The app is served via GitHub Pages or opened directly as a local file.

## Technology Stack

- **Vanilla HTML, CSS, and JavaScript only** – no frameworks, no build step, no bundlers.
- All assets are local; no external scripts, stylesheets, or CDN dependencies.
- The app must always be runnable by opening `index.html` directly in a modern browser or via GitHub Pages.

## File Structure

```
index.html       – app shell (markup only, no inline scripts or styles)
css/styles.css   – all visual styling
js/app.js        – all application logic
README.md        – user-facing documentation
DECISIONS.md     – key technical decisions (see below)
```

Keep CSS and JS in separate files following the separation of concerns principle.

## Coding Conventions

- Escape all user-supplied strings rendered into HTML using dedicated helpers (`escapeHtml` / `escapeAttr`) to prevent XSS.
- Use semantic HTML elements (`<header>`, `<aside>`, `<main>`, `<form>`, `<button>`).
- Include `aria-label` attributes on interactive controls and use `aria-live` for dynamic content regions.
- All interactive elements must be keyboard-navigable.
- Persistence uses `localStorage` under the namespaced key `randomPickerData`. No network requests, cookies, analytics, or telemetry.

## Decisions File

The `DECISIONS.md` file records key technical and design decisions for the project. **When making a significant decision** (e.g. choosing a technology, changing architecture, adding or removing a dependency, altering persistence strategy, or modifying security practices):

1. **Add a dated entry** to `DECISIONS.md` with the date in `YYYY-MM-DD` format.
2. Each entry must include:
   - A clear heading describing the decision.
   - The **date** the decision was made (e.g. `_Date: 2026-05-05_`).
   - The **rationale** explaining why the decision was made.
3. Existing undated entries do not need to be retroactively dated, but all **new and updated entries must include a date**.
4. When an earlier decision is revised or superseded, update or annotate the original entry with the revision date and reason.

## Privacy and Security

- Never introduce third-party scripts, tracking, analytics, or telemetry.
- Never make network requests from the application.
- All data must remain local to the user's browser.

## PR Evidence for UI/Style Changes

- For any PR that changes UI, layout, or styling (`index.html`, `css/styles.css`, or UI-rendering code in `js/app.js`), capture screenshot evidence with the MCP browser tools before finalizing.
- Use the MCP browser flow (`playwright-browser_navigate` + `playwright-browser_take_screenshot`) against the local app (`index.html`) or GitHub Pages URL to show the updated UI state.
- Include the screenshot artifact(s) in the PR evidence/report so reviewers can verify visual changes without pulling the branch.
