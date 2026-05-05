# 🎲 Random Picker

A lightweight, browser-based single page application for random selection. Create topics, fill them with entries, and let fate decide!

## Features

- **Topics** – create and manage multiple independent lists (e.g. "Games", "Restaurants", "Team Names")
- **Entries** – add or remove entries within any topic
- **Random Pick** – animated spinner selects a winner at random, highlighted in the list
- **Persistent** – everything is saved in your browser's `localStorage`; data survives page refreshes
- **Private** – no servers, no accounts, no analytics, no telemetry of any kind

## Running the App

### Option 1 – GitHub Pages (recommended)

Visit the live site: **<https://k-cully.github.io/random-picker/>**

### Option 2 – Direct File Open

1. Clone or download this repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge).

No installation, build step, or internet connection required.

## How to Use

1. **Create a topic** – type a name in the sidebar input and press **+** or Enter.
2. **Select a topic** – click it in the sidebar to open it.
3. **Add entries** – type in the entry input and press **Add** or Enter.
4. **Remove an entry** – hover over it and click the 🗑 button.
5. **Pick!** – click the **🎲 Pick!** button to spin and reveal a random entry.
6. **Delete a topic** – hover over a topic in the sidebar and click **×**.

## Structure

```
index.html       – app shell
css/styles.css   – styles
js/app.js        – application logic
DECISIONS.md     – key technical decisions
```

## Technical Notes

See [DECISIONS.md](DECISIONS.md) for the reasoning behind technology and design choices.
