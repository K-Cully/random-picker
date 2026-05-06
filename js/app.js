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

/* Picker animation constants */
const MIN_SPINS = 18;
const SPIN_VARIANCE = 12;
const SPIN_INTERVAL_MS = 80;

const Storage = {
  /**
   * @returns {{
   *   topics: Record<string, { entries: Array<{text:string, userId:string|null}>, picks: Array<{text:string, userId:string|null, timestamp:number}> }>,
   *   users:  Array<{id:string, name:string, colour:string}>
   * }}
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return Storage.migrate(parsed);
      }
    } catch (_) { /* ignore parse errors */ }
    return { topics: {}, users: [] };
  },

  /** Migrate v1 data (topics as string arrays) to v2 (topic objects with entries + picks). */
  migrate(data) {
    const migrated = { topics: {}, users: data.users || [] };
    for (const [name, value] of Object.entries(data.topics || {})) {
      if (Array.isArray(value)) {
        /* v1 → v2: plain string array */
        migrated.topics[name] = {
          entries: value.map(t => ({ text: t, userId: null })),
          picks: [],
        };
      } else if (value && typeof value === 'object') {
        /* v2: ensure both arrays exist */
        migrated.topics[name] = {
          entries: value.entries || [],
          picks:   value.picks   || [],
        };
      }
    }
    return migrated;
  },

  /** @param {{ topics: object, users: Array }} data */
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
  let state = Storage.load();     // { topics: { [name]: { entries: [...], picks: [...] } }, users: [...] }
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
    state.topics[trimmed] = { entries: [], picks: [] };
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
  function addEntry(topicName, entryText, userId = null) {
    const trimmed = entryText.trim();
    if (!trimmed) return { ok: false, msg: 'Entry cannot be empty.' };
    const topic = state.topics[topicName];
    if (!topic) return { ok: false, msg: 'Topic not found.' };
    if (topic.entries.some(e => e.text.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, msg: `"${trimmed}" is already in this topic.` };
    }
    topic.entries.push({ text: trimmed, userId: userId || null });
    persist();
    return { ok: true, entry: trimmed };
  }

  function removeEntry(topicName, index) {
    const topic = state.topics[topicName];
    if (!topic || index < 0 || index >= topic.entries.length) return;
    topic.entries.splice(index, 1);
    persist();
  }

  /* ---- user operations ---- */
  function addUser(name, colour) {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, msg: 'User name cannot be empty.' };
    if (!state.users) state.users = [];
    const existing = state.users.find(u => u.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return { ok: false, msg: `"${existing.name}" already exists.` };
    const id = crypto.randomUUID();
    state.users.push({ id, name: trimmed, colour });
    persist();
    return { ok: true, user: { id, name: trimmed, colour } };
  }

  function removeUser(id) {
    if (!state.users) return;
    state.users = state.users.filter(u => u.id !== id);
    persist();
  }

  /* ---- selection ---- */
  function pickRandom(topicName) {
    const topic = state.topics[topicName];
    if (!topic || topic.entries.length === 0) return null;
    return topic.entries[Math.floor(Math.random() * topic.entries.length)];
  }

  function recordPick(topicName, entry) {
    const topic = state.topics[topicName];
    if (!topic) return;
    if (!topic.picks) topic.picks = [];
    topic.picks.push({ text: entry.text, userId: entry.userId || null, timestamp: Date.now() });
    persist();
  }

  /* ---- getters ---- */
  function getActiveTopic() { return activeTopic; }
  function getEntries(topicName)     { return state.topics[topicName]?.entries ?? []; }
  function getPickHistory(topicName) { return state.topics[topicName]?.picks   ?? []; }
  function getUsers()                { return state.users || []; }
  function getUserById(id)           { return (state.users || []).find(u => u.id === id) ?? null; }

  return {
    topicNames, addTopic, deleteTopic, selectTopic,
    addEntry, removeEntry, pickRandom, recordPick,
    addUser, removeUser, getUsers, getUserById,
    getActiveTopic, getEntries, getPickHistory,
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

function renderUserList() {
  const list = $('user-list');
  if (!list) return;
  const users = App.getUsers();

  if (users.length === 0) {
    list.innerHTML = '<p class="users-empty">No users yet.</p>';
    return;
  }

  list.innerHTML = '';
  users.forEach(user => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.dataset.userId = user.id;
    item.innerHTML = `
      <span class="user-dot" style="background:${escapeAttr(user.colour)}" aria-hidden="true"></span>
      <span class="user-name">${escapeHtml(user.name)}</span>
      <button class="btn-delete-user" data-user-id="${escapeAttr(user.id)}" title="Remove user" aria-label="Remove user ${escapeAttr(user.name)}">×</button>
    `;

    item.querySelector('.btn-delete-user').addEventListener('click', e => {
      e.stopPropagation();
      App.removeUser(user.id);
      renderUserList();
      renderMainContent();   /* refresh entry form user select */
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
  const picks   = App.getPickHistory(topic);
  const users   = App.getUsers();

  const userSelectHtml = users.length > 0 ? `
    <select id="new-entry-user" class="input-field entry-user-select" aria-label="Attribute to user">
      <option value="">— no user —</option>
      ${users.map(u => `<option value="${escapeAttr(u.id)}">${escapeHtml(u.name)}</option>`).join('')}
    </select>` : '';

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
          ${userSelectHtml}
          <button class="btn btn-primary" type="submit">Add</button>
        </form>

        <div id="entries-list" class="entries-list" style="margin-top:12px">
          ${renderEntriesHtml(topic, entries)}
        </div>
      </div>

      <!-- Pick History -->
      <div class="card">
        <p class="card-title">📜 Pick History</p>
        <div id="pick-history-list" class="pick-history-list">
          ${renderPickHistoryHtml(picks)}
        </div>
      </div>
    </div>
  `;

  /* Wire up entry form */
  $('add-entry-form').addEventListener('submit', e => {
    e.preventDefault();
    const input      = $('new-entry-input');
    const userSelect = $('new-entry-user');
    const userId     = userSelect ? (userSelect.value || null) : null;
    const result = App.addEntry(topic, input.value, userId);
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
  return entries.map((entry, idx) => {
    const user = entry.userId ? App.getUserById(entry.userId) : null;
    return `
      <div class="entry-item" data-index="${idx}" id="entry-${idx}">
        <span class="entry-number">${idx + 1}</span>
        ${user ? `<span class="entry-user-dot" style="background:${escapeAttr(user.colour)}" title="${escapeAttr(user.name)}" aria-label="User: ${escapeAttr(user.name)}"></span>` : ''}
        <span class="entry-name">${escapeHtml(entry.text)}</span>
        ${user ? `<span class="entry-user-name">${escapeHtml(user.name)}</span>` : ''}
        <button
          class="btn-delete-entry"
          data-index="${idx}"
          title="Remove entry"
          aria-label="Remove ${escapeAttr(entry.text)}"
        >🗑</button>
      </div>
    `;
  }).join('');
}

function renderPickHistoryHtml(picks) {
  if (!picks || picks.length === 0) {
    return '<p class="picks-empty">No picks yet.</p>';
  }
  return [...picks].reverse().map(pick => {
    const user    = pick.userId ? App.getUserById(pick.userId) : null;
    const date    = new Date(pick.timestamp);
    const timeStr = date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    return `
      <div class="pick-history-item">
        <span class="pick-user-dot${user ? '' : ' pick-user-dot--none'}" ${user ? `style="background:${escapeAttr(user.colour)}"` : ''} aria-hidden="true"></span>
        <span class="pick-entry-text">${escapeHtml(pick.text)}</span>
        ${user ? `<span class="pick-user-name">${escapeHtml(user.name)}</span>` : ''}
        <span class="pick-timestamp">${escapeHtml(timeStr)}</span>
      </div>
    `;
  }).join('');
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
  const totalSpins = MIN_SPINS + Math.floor(Math.random() * SPIN_VARIANCE);

  resultEl.innerHTML = '<span class="result-text result-spinning">…</span>';
  const spinEl = resultEl.querySelector('.result-text');

  App.spinInterval = setInterval(() => {
    spins++;
    const pick = App.pickRandom(topic);
    if (spins < totalSpins) {
      if (pick) spinEl.textContent = pick.text;
    } else {
      clearInterval(App.spinInterval);
      App.spinInterval = null;

      /* final pick */
      const winner = App.pickRandom(topic);
      if (!winner) { pickBtn.disabled = false; return; }

      const user = winner.userId ? App.getUserById(winner.userId) : null;
      resultEl.innerHTML = `
        <div class="winner-display">
          ${user ? `<span class="winner-user-dot" style="background:${escapeAttr(user.colour)}" aria-hidden="true"></span>` : ''}
          <span class="result-text">${escapeHtml(winner.text)}</span>
          ${user ? `<span class="winner-user-name">${escapeHtml(user.name)}</span>` : ''}
        </div>
      `;

      /* record the pick and update history panel */
      App.recordPick(topic, winner);
      const historyEl = $('pick-history-list');
      if (historyEl) {
        historyEl.innerHTML = renderPickHistoryHtml(App.getPickHistory(topic));
      }

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
  }, SPIN_INTERVAL_MS);
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

  /* Add User form */
  $('add-user-form').addEventListener('submit', e => {
    e.preventDefault();
    const nameInput   = $('new-user-name');
    const colourInput = $('new-user-colour');
    const result = App.addUser(nameInput.value, colourInput.value);
    if (!result.ok) { showToast(result.msg); return; }
    nameInput.value = '';
    renderUserList();
    renderMainContent();   /* refresh entry form user select */
    showToast(`User "${result.user.name}" added!`, 'success');
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
  renderUserList();
  renderMainContent();
});
