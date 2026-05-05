/**
 * Random Picker – App Logic
 *
 * Architecture:
 *  - Storage   : thin wrapper around localStorage
 *  - App       : application state + business logic
 *  - UI helpers: DOM utility functions
 */

'use strict';

/* =========================================================
   Storage
   ========================================================= */
const STORAGE_KEY = 'randomPickerData';

const Storage = {
  /** @returns {{ topics: Record<string, string[]> }} */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) { /* ignore parse errors */ }
    return { topics: {} };
  },

  /** @param {{ topics: Record<string, string[]> }} data */
  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) { /* quota exceeded or private browsing */ }
  },
};

/* =========================================================
   App State & Logic
   ========================================================= */
const App = (() => {
  let state = Storage.load();     // { topics: { [name]: [entry, ...] } }
  let activeTopic = null;
  let spinInterval = null;

  /* ---- helpers ---- */
  function topicNames() {
    return Object.keys(state.topics).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
  }

  function persist() {
    Storage.save(state);
  }

  /* ---- topic operations ---- */
  function addTopic(name) {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, msg: 'Topic name cannot be empty.' };
    const key = trimmed.toLowerCase();
    const existing = Object.keys(state.topics).find(
      t => t.toLowerCase() === key
    );
    if (existing) return { ok: false, msg: `"${existing}" already exists.` };
    state.topics[trimmed] = [];
    persist();
    return { ok: true, topic: trimmed };
  }

  function deleteTopic(name) {
    if (!(name in state.topics)) return;
    delete state.topics[name];
    if (activeTopic === name) activeTopic = null;
    persist();
  }

  function selectTopic(name) {
    activeTopic = (name in state.topics) ? name : null;
  }

  /* ---- entry operations ---- */
  function addEntry(topicName, entry) {
    const trimmed = entry.trim();
    if (!trimmed) return { ok: false, msg: 'Entry cannot be empty.' };
    const list = state.topics[topicName];
    if (!list) return { ok: false, msg: 'Topic not found.' };
    if (list.some(e => e.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, msg: `"${trimmed}" is already in this topic.` };
    }
    list.push(trimmed);
    persist();
    return { ok: true, entry: trimmed };
  }

  function removeEntry(topicName, index) {
    const list = state.topics[topicName];
    if (!list || index < 0 || index >= list.length) return;
    list.splice(index, 1);
    persist();
  }

  /* ---- selection ---- */
  function pickRandom(topicName) {
    const list = state.topics[topicName];
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ---- getters ---- */
  function getActiveTopic() { return activeTopic; }
  function getEntries(topicName) { return state.topics[topicName] ?? []; }

  return {
    topicNames, addTopic, deleteTopic, selectTopic,
    addEntry, removeEntry, pickRandom,
    getActiveTopic, getEntries,
    get spinInterval() { return spinInterval; },
    set spinInterval(v) { spinInterval = v; },
  };
})();

/* =========================================================
   UI Helpers
   ========================================================= */
function $(id) { return document.getElementById(id); }

function showToast(msg, type = '') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast${type ? ` toast-${type}` : ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* =========================================================
   Render Functions
   ========================================================= */

function renderTopicList() {
  const list = $('topic-list');
  const names = App.topicNames();

  if (names.length === 0) {
    list.innerHTML = '<p class="topics-empty">No topics yet.<br>Add one below!</p>';
    return;
  }

  list.innerHTML = '';
  names.forEach(name => {
    const count = App.getEntries(name).length;
    const item = document.createElement('div');
    item.className = 'topic-item' + (name === App.getActiveTopic() ? ' active' : '');
    item.dataset.topic = name;
    item.innerHTML = `
      <span class="topic-dot" aria-hidden="true"></span>
      <span class="topic-name">${escapeHtml(name)}</span>
      <span class="topic-count">${count}</span>
      <button class="btn-delete-topic" data-topic="${escapeAttr(name)}" title="Delete topic" aria-label="Delete topic ${escapeAttr(name)}">×</button>
    `;

    item.addEventListener('click', e => {
      if (e.target.closest('.btn-delete-topic')) return;
      App.selectTopic(name);
      renderTopicList();
      renderMainContent();
    });

    item.querySelector('.btn-delete-topic').addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`Delete topic "${name}" and all its entries?`)) return;
      App.deleteTopic(name);
      renderTopicList();
      renderMainContent();
    });

    list.appendChild(item);
  });
}

function renderMainContent() {
  const main = $('main-content');
  const topic = App.getActiveTopic();

  if (!topic) {
    main.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">🎲</span>
        <h2>Pick something random!</h2>
        <p>Select a topic from the sidebar or create a new one to get started.</p>
      </div>
    `;
    return;
  }

  const entries = App.getEntries(topic);

  main.innerHTML = `
    <div class="topic-view">
      <div class="topic-view-header">
        <h2>${escapeHtml(topic)}</h2>
      </div>

      <!-- Picker -->
      <div class="card picker-card">
        <p class="card-title">✨ Random Selection</p>
        <div class="picker-result" id="picker-result">
          ${entries.length === 0
            ? '<span class="result-placeholder">Add entries to start picking</span>'
            : '<span class="result-placeholder">Hit "Pick!" to select a random entry</span>'
          }
        </div>
        <div class="picker-actions">
          <button class="btn btn-accent" id="btn-pick" ${entries.length === 0 ? 'disabled' : ''}>
            🎲 Pick!
          </button>
        </div>
      </div>

      <!-- Entries -->
      <div class="card">
        <p class="card-title">📋 Entries (${entries.length})</p>

        <form class="add-entry-form" id="add-entry-form" novalidate>
          <input
            class="input-field"
            id="new-entry-input"
            type="text"
            placeholder="Add a new entry…"
            maxlength="200"
            autocomplete="off"
          />
          <button class="btn btn-primary" type="submit">Add</button>
        </form>

        <div id="entries-list" class="entries-list" style="margin-top:12px">
          ${renderEntriesHtml(topic, entries)}
        </div>
      </div>
    </div>
  `;

  /* Wire up entry form */
  $('add-entry-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('new-entry-input');
    const result = App.addEntry(topic, input.value);
    if (!result.ok) { showToast(result.msg); return; }
    input.value = '';
    input.focus();
    renderTopicList();   // update count badge
    renderMainContent();
  });

  /* Wire up pick button */
  $('btn-pick').addEventListener('click', () => runPicker(topic));
}

function renderEntriesHtml(topic, entries) {
  if (entries.length === 0) {
    return '<p class="entries-empty">No entries yet. Add your first one above!</p>';
  }
  return entries.map((entry, idx) => `
    <div class="entry-item" data-index="${idx}" id="entry-${idx}">
      <span class="entry-number">${idx + 1}</span>
      <span class="entry-name">${escapeHtml(entry)}</span>
      <button
        class="btn-delete-entry"
        data-index="${idx}"
        title="Remove entry"
        aria-label="Remove ${escapeAttr(entry)}"
      >🗑</button>
    </div>
  `).join('');
}

/* =========================================================
   Picker Animation
   ========================================================= */
function runPicker(topic) {
  const entries = App.getEntries(topic);
  if (entries.length === 0) return;

  /* stop any previous spin */
  if (App.spinInterval) {
    clearInterval(App.spinInterval);
    App.spinInterval = null;
  }

  const resultEl = $('picker-result');
  const pickBtn  = $('btn-pick');
  if (!resultEl || !pickBtn) return;

  pickBtn.disabled = true;

  /* clear previous highlights */
  document.querySelectorAll('.entry-item.highlighted').forEach(el =>
    el.classList.remove('highlighted')
  );

  /* spinning phase */
  let spins = 0;
  const totalSpins = 18 + Math.floor(Math.random() * 12); // 18-29 spins
  let current = '';

  resultEl.innerHTML = '<span class="result-text result-spinning">…</span>';
  const spinEl = resultEl.querySelector('.result-text');

  App.spinInterval = setInterval(() => {
    spins++;
    const pick = App.pickRandom(topic);
    if (spins < totalSpins) {
      spinEl.textContent = pick;
    } else {
      clearInterval(App.spinInterval);
      App.spinInterval = null;

      /* final pick */
      const winner = App.pickRandom(topic);
      current = winner;
      resultEl.innerHTML = `<span class="result-text">${escapeHtml(winner)}</span>`;

      /* highlight matching entry */
      const currentEntries = App.getEntries(topic);
      const idx = currentEntries.indexOf(winner);
      if (idx !== -1) {
        const entryEl = document.getElementById(`entry-${idx}`);
        if (entryEl) {
          entryEl.classList.add('highlighted');
          entryEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      pickBtn.disabled = false;
    }
  }, 80);
}

/* =========================================================
   String Escaping (XSS prevention)
   ========================================================= */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

/* =========================================================
   Initialisation
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  /* Add Topic form */
  $('add-topic-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('new-topic-input');
    const result = App.addTopic(input.value);
    if (!result.ok) { showToast(result.msg); return; }
    input.value = '';
    App.selectTopic(result.topic);
    renderTopicList();
    renderMainContent();
    showToast(`Topic "${result.topic}" created!`, 'success');
  });

  /* Delete-entry delegation (re-attached inside renderMainContent via event listeners,
     but also handle dynamically rendered buttons via delegation on main-content) */
  $('main-content').addEventListener('click', e => {
    const btn = e.target.closest('.btn-delete-entry');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    const topic = App.getActiveTopic();
    if (!topic) return;
    App.removeEntry(topic, idx);
    renderTopicList();
    renderMainContent();
  });

  /* Initial render */
  renderTopicList();
  renderMainContent();
});
