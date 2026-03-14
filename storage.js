// Persists the active list's current todos into the app state map.
function persistActiveTodos() {
  if (!activeListId) return;
  todosByList[activeListId] = todos;
}

// Loads saved app state from local storage and falls back to defaults.
async function loadTodos() {
  try {
    const raw = localStorage.getItem(APP_STATE_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.lists) && data.todosByList && typeof data.todosByList === 'object') {
      lists = data.lists.map((l, idx) => ({
        id: String(l.id || `list-${idx + 1}`),
        name: typeof l.name === 'string' ? l.name : (idx === 0 ? 'To-do' : ''),
        color: String(l.color || getThemeListColors().start[idx % getThemeListColors().start.length]),
        colorIndex: Number.isFinite(l.colorIndex) ? Number(l.colorIndex) : idx
      }));
      todosByList = {};
      Object.entries(data.todosByList).forEach(([id, value]) => {
        todosByList[id] = Array.isArray(value) ? value : [];
      });
      const preferred = localStorage.getItem(ACTIVE_LIST_STORAGE_KEY);
      activeListId = preferred && todosByList[preferred]
        ? preferred
        : (data.activeListId && todosByList[data.activeListId] ? String(data.activeListId) : null);
    } else {
      throw new Error('No local state');
    }
  } catch (_err) {
    const palette = getThemeListColors().start;
    const list = { id: 'list-1', name: 'To-do', color: palette[0], colorIndex: 0 };
    lists = [list];
    todosByList = { [list.id]: [...DEFAULT_TODOS] };
    activeListId = list.id;
  } finally {
    ensureActiveList();
    localStorage.setItem(ACTIVE_LIST_STORAGE_KEY, activeListId);
    hasLoadedFromStorage = true;
    todos = normalizeTodoOrder(todos);
    persistActiveTodos();
    const state = { lists, todosByList };
    lastSavedPayload = JSON.stringify(state);
    render();
  }
}

// Debounces local storage writes for app state changes.
function scheduleSave() {
  if (!hasLoadedFromStorage) return;
  persistActiveTodos();
  const payload = JSON.stringify({ lists, todosByList });
  if (payload === lastSavedPayload) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistActiveTodos();
    const currentPayload = JSON.stringify({ lists, todosByList });
    if (currentPayload === lastSavedPayload) return;
    try {
      localStorage.setItem(APP_STATE_STORAGE_KEY, currentPayload);
      lastSavedPayload = currentPayload;
      hasShownStorageWarning = false;
    } catch (err) {
      console.error(err);
      if (!hasShownStorageWarning) {
        hasShownStorageWarning = true;
        window.alert('Storage is full. Image changes may not save. Try fewer/smaller images.');
      }
    }
  }, 200);
}
