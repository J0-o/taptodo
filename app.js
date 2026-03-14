// Caches the DOM nodes used throughout the app shell.
const listEl = document.getElementById('list');
const listViewportEl = document.getElementById('list-viewport');
const inputEl = document.getElementById('todo-input');
const formEl = document.getElementById('new-todo');
const modalRoot = document.getElementById('modal-root');
const quickAddEl = document.getElementById('quick-add');
const calendarBtnEl = document.getElementById('calendar-btn');
const quickButtons = Array.from(quickAddEl.querySelectorAll('button'));
const listTabsEl = document.getElementById('list-tabs');
const shellEl = document.querySelector('.shell');
const appMenuEl = document.getElementById('app-menu');
const appMenuBtnEl = document.getElementById('app-menu-btn');
const appMenuPanelEl = document.getElementById('app-menu-panel');
const newListBtnEl = document.getElementById('new-list-btn');
const themeSwitcherEl = document.getElementById('theme-switcher');

// Defines storage keys and theme defaults for the app.
const ACTIVE_LIST_STORAGE_KEY = 'todoapp.activeListId';
const APP_STATE_STORAGE_KEY = 'todoapp.appState.v1';
const THEME_STORAGE_KEY = 'todoapp.theme';
const DEFAULT_THEME = 'dark';
const THEME_OPTIONS = new Set(['dark', 'light', 'heatmap', 'sepia']);

// Provides the starter todos used when no saved state exists.
const DEFAULT_TODOS = [
  { id: 1, text: 'Plan weekend hike', complete: false, notes: '', dueDate: '', dueTime: '', cardScroll: 0, images: [], manualOrder: 1 },
  { id: 2, text: 'Send project update', complete: false, notes: '', dueDate: '', dueTime: '', cardScroll: 0, images: [], manualOrder: 2 },
  { id: 3, text: 'Restock groceries', complete: false, notes: '', dueDate: '', dueTime: '', cardScroll: 0, images: [], manualOrder: 3 }
];

// Tracks persisted app data and storage lifecycle state.
let todos = [];
let lists = [];
let todosByList = {};
let activeListId = null;
let nextTodoId = 1;
let hasLoadedFromStorage = false;
let lastSavedPayload = '';
let saveTimer = null;
let hasShownStorageWarning = false;

// Tracks transient UI state for gestures, modals, and scroll restoration.
let dragState = { from: null, to: null };
let expandedIndex = null;
let notesModalIndex = null;
let dueModalIndex = null;
let ignoreBackdropUntil = 0;
let pendingImageTodoIndex = null;
let imagePreview = null;
let quickCalendarOpen = false;
let handleMoveMenuIndex = null;
let tabEditListId = null;
let todoEditIndex = null;
let imageZoom = 1;
let imagePanX = 0;
let imagePanY = 0;
let imageThumbScrollByTodo = {};
let listScrollByListId = {};

// Updates viewport-related CSS variables for keyboard and modal sizing.
function updateViewportMetrics() {
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const keyboardOffset = Math.max(0, window.innerHeight - viewportHeight);
  document.documentElement.style.setProperty('--app-vh', `${Math.round(viewportHeight)}px`);
  document.documentElement.style.setProperty('--keyboard-offset', `${Math.round(keyboardOffset)}px`);
}

// Creates the shared hidden file input used for image picking.
const filePicker = document.createElement('input');
filePicker.type = 'file';
filePicker.accept = 'image/*';
filePicker.multiple = true;
filePicker.style.display = 'none';
document.body.appendChild(filePicker);

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo('');
});

quickAddEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-quick]');
  if (!btn) return;
  const type = btn.dataset.quick;
  const now = new Date();
  const due = new Date(now);
  if (type === 'today') {
  } else if (type === 'tomorrow') {
    due.setDate(due.getDate() + 1);
  } else if (type === 'nextweek') {
    const day = due.getDay();
    const daysUntilNextMonday = ((8 - day) % 7) || 7;
    due.setDate(due.getDate() + daysUntilNextMonday);
  } else if (type === 'nextmonth') {
    due.setMonth(due.getMonth() + 1, 1);
  }
  addTodo(formatDateLocal(due));
  inputEl.focus();
});

calendarBtnEl.addEventListener('click', () => {
  quickCalendarOpen = true;
  render();
});

filePicker.addEventListener('change', async (e) => {
  await handlePickedImages(e.target.files);
  filePicker.value = '';
});

document.addEventListener('keydown', (e) => {
  const isSelectAll = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a';
  if (!isSelectAll) return;
  const target = e.target;
  const editable = target instanceof HTMLElement &&
    (target.matches('input, textarea, [contenteditable="true"]') || target.closest('input, textarea, [contenteditable="true"]'));
  if (!editable) e.preventDefault();
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    if (!quickButtons.length) return;
    e.preventDefault();
    quickButtons[0].focus();
  }
});

quickAddEl.addEventListener('keydown', (e) => {
  const current = e.target.closest('button');
  if (!current) return;
  const idx = quickButtons.indexOf(current);
  if (idx === -1) return;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    quickButtons[(idx + 1) % quickButtons.length].focus();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    quickButtons[(idx - 1 + quickButtons.length) % quickButtons.length].focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    inputEl.focus();
  }
});

// Creates a new empty list and switches focus to it.
function createNewList() {
  const newList = {
    id: `list-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: '',
    color: '',
    colorIndex: 0
  };
  lists.push(newList);
  normalizeListColorsByOrder();
  todosByList[newList.id] = [];
  switchList(newList.id);
}

// Returns the currently active theme name.
function getCurrentTheme() {
  const raw = document.documentElement.dataset.theme || DEFAULT_THEME;
  return THEME_OPTIONS.has(raw) ? raw : DEFAULT_THEME;
}

// Reapplies list colors based on the current theme palette.
function applyThemeListColors() {
  normalizeListColorsByOrder();
}

// Assigns list colors from the current theme palette in display order.
function normalizeListColorsByOrder() {
  const palette = getThemeListColors().start;
  if (!lists.length || !palette.length) return;
  lists.forEach((list, idx) => {
    const paletteIdx = idx % palette.length;
    list.colorIndex = paletteIdx;
    list.color = palette[paletteIdx];
  });
}

// Opens the app menu panel.
function openAppMenu() {
  appMenuPanelEl.hidden = false;
  appMenuBtnEl.setAttribute('aria-expanded', 'true');
}

// Closes the app menu panel.
function closeAppMenu() {
  appMenuPanelEl.hidden = true;
  appMenuBtnEl.setAttribute('aria-expanded', 'false');
}

// Toggles the app menu panel open state.
function toggleAppMenu() {
  if (appMenuPanelEl.hidden) openAppMenu();
  else closeAppMenu();
}

// Applies a theme and rerenders the app with updated tokens.
function applyTheme(themeName) {
  const next = THEME_OPTIONS.has(themeName) ? themeName : DEFAULT_THEME;
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_STORAGE_KEY, next);
  if (themeSwitcherEl) themeSwitcherEl.value = next;
  applyThemeListColors();
  render();
}

appMenuBtnEl.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleAppMenu();
});

newListBtnEl.addEventListener('click', () => {
  createNewList();
  closeAppMenu();
});

themeSwitcherEl.addEventListener('change', (e) => {
  const selected = String(e.target.value || '').trim();
  if (!THEME_OPTIONS.has(selected)) return;
  applyTheme(selected);
  closeAppMenu();
});

document.addEventListener('click', (e) => {
  if (!appMenuEl.contains(e.target)) closeAppMenu();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAppMenu();
});

window.addEventListener('resize', updateActiveTabGlowAnchor);
window.addEventListener('resize', updateViewportMetrics);
listTabsEl.addEventListener('scroll', updateActiveTabGlowAnchor, { passive: true });
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateViewportMetrics);
  window.visualViewport.addEventListener('scroll', updateViewportMetrics);
}

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME);
updateViewportMetrics();

setInterval(updateCountdowns, 30000);

// Clears transient UI state when switching between lists.
function resetUiStateForListSwitch() {
  dragState = { from: null, to: null };
  expandedIndex = null;
  notesModalIndex = null;
  dueModalIndex = null;
  imagePreview = null;
  pendingImageTodoIndex = null;
  quickCalendarOpen = false;
  handleMoveMenuIndex = null;
  tabEditListId = null;
  todoEditIndex = null;
}

// Returns the currently active list object.
function getActiveList() {
  return lists.find((l) => l.id === activeListId) || null;
}

// Computes the hue angle for the active list accent color.
function getActiveHue() {
  const color = getActiveList()?.color || getThemeListColors().start[0] || '';
  const hex = color.replace('#', '');
  const normalized = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const int = Number.parseInt(normalized, 16);
  if (!Number.isFinite(int)) return 20;
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(h * 60 < 0 ? h * 60 + 360 : h * 60);
}

// Pushes the active list accent color into CSS custom properties.
function applyActiveAccent() {
  const color = getActiveList()?.color || getThemeListColors().start[0] || '';
  document.documentElement.style.setProperty('--list-accent', color);
  document.documentElement.style.setProperty('--list-accent-rgb', hexToRgbTriplet(color));
}

// Ensures there is a valid active list and active todo array.
function ensureActiveList() {
  if (!lists.length) {
    const palette = getThemeListColors().start;
    const list = { id: 'list-1', name: 'To-do', color: palette[0], colorIndex: 0 };
    lists = [list];
    todosByList[list.id] = [...DEFAULT_TODOS];
    activeListId = list.id;
  }
  if (!activeListId || !lists.some((l) => l.id === activeListId)) activeListId = lists[0].id;
  normalizeListColorsByOrder();
  if (!Array.isArray(todosByList[activeListId])) todosByList[activeListId] = [];
  todos = todosByList[activeListId];
}

// Switches the app to a different list and preserves scroll state.
function switchList(listId) {
  if (activeListId) {
    listScrollByListId[activeListId] = listViewportEl.scrollTop;
  }
  persistActiveTodos();
  activeListId = listId;
  localStorage.setItem(ACTIVE_LIST_STORAGE_KEY, activeListId);
  ensureActiveList();
  resetUiStateForListSwitch();
  render();
}

// Aligns the tab glow anchor with the active list tab.
function updateActiveTabGlowAnchor() {
  if (!shellEl || !listTabsEl) return;
  const activeTab = listTabsEl.querySelector('.list-tab.active');
  if (!activeTab) {
    shellEl.style.setProperty('--tab-glow-x', '50%');
    return;
  }
  const shellRect = shellEl.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  const centerX = tabRect.left - shellRect.left + (tabRect.width / 2);
  shellEl.style.setProperty('--tab-glow-x', `${Math.round(centerX)}px`);
}

// Deletes a list and selects a valid fallback list when needed.
function deleteList(listId) {
  if (lists.length <= 1) return;
  const idx = lists.findIndex((l) => l.id === listId);
  if (idx === -1) return;
  delete todosByList[listId];
  lists.splice(idx, 1);
  normalizeListColorsByOrder();
  if (activeListId === listId) {
    const fallback = lists[Math.max(0, idx - 1)] || lists[0];
    activeListId = fallback ? fallback.id : null;
    if (activeListId) localStorage.setItem(ACTIVE_LIST_STORAGE_KEY, activeListId);
  }
  ensureActiveList();
}

// Returns whether the quick-add form currently owns focus.
function isQuickAddVisible() {
  return formEl.matches(':focus-within');
}

// Normalizes todo ordering, grouping, and completed-item placement.
function normalizeTodoOrder(source) {
  const list = source.map((t, i) => ({
    ...t,
    id: t.id ?? (i + 1),
    complete: !!t.complete,
    completedAt: Number.isFinite(t.completedAt) ? Number(t.completedAt) : null,
    manualOrder: Number.isFinite(t.manualOrder) ? t.manualOrder : (i + 1),
    images: Array.isArray(t.images) ? t.images : []
  }));

  const maxId = list.reduce((m, t) => Math.max(m, t.id), 0);
  if (maxId >= nextTodoId) nextTodoId = maxId + 1;

  const dueDated = list.filter((t) => !!t.dueDate);
  const noDue = list.filter((t) => !t.dueDate).sort((a, b) => a.manualOrder - b.manualOrder);

  const byDate = new Map();
  dueDated.forEach((t) => {
    if (!byDate.has(t.dueDate)) byDate.set(t.dueDate, []);
    byDate.get(t.dueDate).push(t);
  });

  const sortedDates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
  const orderedDue = [];
  sortedDates.forEach((dateKey) => {
    const group = byDate.get(dateKey);
    const timed = [...group]
      .filter((t) => !!t.dueTime)
      .sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '') || (a.manualOrder - b.manualOrder));
    const untimed = [...group]
      .filter((t) => !t.dueTime)
      .sort((a, b) => a.manualOrder - b.manualOrder);
    orderedDue.push(...timed, ...untimed);
  });

  const ordered = [...orderedDue, ...noDue];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = startOfToday + (24 * 60 * 60 * 1000);
  const isCompletedToday = (todo) => {
    const ts = Number(todo.completedAt);
    return todo.complete && Number.isFinite(ts) && ts >= startOfToday && ts < startOfTomorrow;
  };

  const keepInPlace = ordered.filter((t) => !t.complete || isCompletedToday(t));
  const completeOlder = ordered
    .filter((t) => t.complete && !isCompletedToday(t))
    .sort((a, b) => (Number(b.completedAt) || 0) - (Number(a.completedAt) || 0));
  return [...keepInPlace, ...completeOlder];
}

// Adds a new todo using the current input text and optional due fields.
function addTodo(dueDate = '', dueTime = '') {
  const text = inputEl.value.trim();
  if (!text) return;
  todos.unshift({
    id: nextTodoId++,
    text,
    complete: false,
    completedAt: null,
    notes: '',
    dueDate,
    dueTime,
    cardScroll: 0,
    images: [],
    manualOrder: Date.now()
  });
  inputEl.value = '';
  render();
}

loadTodos();
