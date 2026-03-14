// Returns whether a todo belongs to the no-due-date group.
function isNoDue(todo) {
  return !todo.dueDate;
}

// Commits a drag reorder operation within the active due-date group.
function finalizeDrop() {
  const { from, to } = dragState;
  if (from === null || to === null) return;
  const adjustedTo = to > from ? to - 1 : to;
  if (from === adjustedTo) return render();

  const moved = todos[from];
  if (!moved) return render();

  const inSameGroup = (todo) => {
    if (isNoDue(moved)) return isNoDue(todo);
    return todo.dueDate === moved.dueDate;
  };

  const groupIndices = todos
    .map((todo, i) => (inSameGroup(todo) ? i : -1))
    .filter((i) => i !== -1);
  if (!groupIndices.length) return render();

  const regionStart = groupIndices[0];
  const regionEnd = groupIndices[groupIndices.length - 1];
  if (adjustedTo < regionStart || adjustedTo > regionEnd + 1) {
    dragState = { from: null, to: null };
    return render();
  }

  const groupTodos = todos.filter(inSameGroup);
  const groupWithoutMoved = groupTodos.filter((t) => t.id !== moved.id);
  let targetWithinGroup = 0;
  for (let i = 0; i < to; i++) {
    const todo = todos[i];
    if (inSameGroup(todo) && todo.id !== moved.id) targetWithinGroup++;
  }
  if (targetWithinGroup < 0) targetWithinGroup = 0;
  if (targetWithinGroup > groupWithoutMoved.length) targetWithinGroup = groupWithoutMoved.length;
  groupWithoutMoved.splice(targetWithinGroup, 0, moved);
  groupWithoutMoved.forEach((todo, i) => {
    todo.manualOrder = i + 1;
  });

  dragState = { from: null, to: null };
  todos = normalizeTodoOrder(todos);
  render();
}

// Clears preview transforms from all non-active list items.
function clearPreviewTransforms(activeEl) {
  [...listEl.children].forEach((child) => {
    if (child !== activeEl) child.style.transform = '';
  });
}

// Applies temporary transforms to show the current reorder target.
function applyReorderPreview(activeEl, from, to) {
  const children = [...listEl.children];
  const gap = parseFloat(getComputedStyle(listEl).rowGap || getComputedStyle(listEl).gap || '10') || 10;
  const shift = activeEl.offsetHeight + gap;

  clearPreviewTransforms(activeEl);

  if (to > from) {
    for (let i = from + 1; i < to; i++) {
      if (children[i] && children[i] !== activeEl) children[i].style.transform = `translateY(${-shift}px)`;
    }
    return;
  }

  if (to < from) {
    for (let i = to; i < from; i++) {
      if (children[i] && children[i] !== activeEl) children[i].style.transform = `translateY(${shift}px)`;
    }
  }
}

// Finds the insertion index for a dragged item based on pointer position.
function getInsertIndex(activeEl, pointerY) {
  const items = [...listEl.children];
  let insertAt = items.length;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === activeEl) continue;
    const rect = item.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (pointerY < mid) {
      insertAt = i;
      break;
    }
  }
  return insertAt;
}

// Attaches swipe, tap, and drag interactions to a todo row.
function attachGesture(el, gestureEl, handleEl, index) {
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let mode = null;
  let suppressTap = false;
  let fromHandle = false;
  let pointerId = null;
  let currentDx = 0;
  let currentDy = 0;
  let lastDx = 0;
  let startViewportScrollTop = 0;
  let longPressTimer = null;
  let longPressTriggered = false;

  const SWIPE_THRESHOLD = 8;
  const DRAG_THRESHOLD = 12;
  const AXIS_MARGIN = 4;
  const DRAG_HOLD_MS = 130;
  const DRAG_FORCE_DISTANCE = 26;
  const HANDLE_LONG_PRESS_MS = 450;

  gestureEl.addEventListener('pointerdown', (e) => {
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startTime = performance.now();
    currentDx = 0;
    currentDy = 0;
    lastDx = 0;
    fromHandle = e.target === handleEl || e.target.closest('.drag-handle') === handleEl;
    if (fromHandle) e.preventDefault();
    suppressTap = fromHandle;
    mode = null;
    startViewportScrollTop = listViewportEl.scrollTop;
    dragState = { from: index, to: index };
    gestureEl.setPointerCapture(e.pointerId);

    clearLongPress();
    longPressTriggered = false;
    if (fromHandle) {
      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        handleMoveMenuIndex = index;
        ignoreBackdropUntil = Date.now() + 220;
        render();
      }, HANDLE_LONG_PRESS_MS);
    }
  });

  gestureEl.addEventListener('pointermove', (e) => {
    if (pointerId !== e.pointerId) return;
    currentDx = e.clientX - startX;
    currentDy = e.clientY - startY;

    if (!mode) {
      const absX = Math.abs(currentDx);
      const absY = Math.abs(currentDy);
      const distance = Math.max(absX, absY);
      const heldFor = performance.now() - startTime;
      if (distance < SWIPE_THRESHOLD) return;
      if (distance > 5) clearLongPress();
      suppressTap = true;

      if (fromHandle) {
        const canStartDrag = (absY >= DRAG_THRESHOLD && heldFor >= DRAG_HOLD_MS) || absY >= DRAG_FORCE_DISTANCE;
        if (!canStartDrag) return;
        mode = 'drag';
      } else if (absX > absY + AXIS_MARGIN) {
        mode = 'swipe';
      } else {
        return;
      }
    }

    if (mode === 'swipe') {
      if (expandedIndex === index) {
        const strip = el.querySelector('.cards-strip');
        if (strip) strip.scrollLeft -= (currentDx - lastDx);
        lastDx = currentDx;
        return;
      }
      el.style.transform = `translateX(${currentDx}px)`;
      el.classList.add('swiping');
      return;
    }

    const scrollDelta = listViewportEl.scrollTop - startViewportScrollTop;
    el.style.transform = `translateY(${currentDy + scrollDelta}px)`;
    el.classList.add('dragging');
    const to = getInsertIndex(el, e.clientY);
    dragState.to = to;
    applyReorderPreview(el, index, to);
    maybeAutoScrollWhileReordering(e.clientY);
  });

  gestureEl.addEventListener('pointerup', (e) => finishGesture(e));
  gestureEl.addEventListener('pointercancel', (e) => finishGesture(e, true));

  // Finalizes the active pointer gesture and applies its result.
  function finishGesture(e, canceled = false) {
    if (pointerId !== e.pointerId) return;
    gestureEl.releasePointerCapture(e.pointerId);
    clearLongPress();

    if (longPressTriggered) {
      resetLocal();
      return;
    }

    if (!canceled && mode === null && !suppressTap) {
      if (isQuickAddVisible()) {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
        resetLocal();
        return;
      }
      clearPreviewTransforms(el);
      el.style.transform = '';
      el.classList.remove('swiping');
      el.classList.remove('dragging');
      if (expandedIndex === index) expandedIndex = null;
      else expandedIndex = index;
      render();
      resetLocal();
      return;
    }

    if (!canceled && mode === 'swipe' && expandedIndex !== index && Math.abs(currentDx) > 80) {
      todos[index].complete = !todos[index].complete;
      todos[index].completedAt = todos[index].complete ? Date.now() : null;
      render();
      resetLocal();
      return;
    }

    if (!canceled && mode === 'drag') {
      clearPreviewTransforms(el);
      finalizeDrop();
      resetLocal();
      return;
    }

    clearPreviewTransforms(el);
    el.style.transform = '';
    el.classList.remove('swiping');
    el.classList.remove('dragging');
    resetLocal();
  }

  // Resets gesture-local state after an interaction completes.
  function resetLocal() {
    pointerId = null;
    mode = null;
    currentDx = 0;
    currentDy = 0;
    lastDx = 0;
    dragState = { from: null, to: null };
    clearLongPress();
    longPressTriggered = false;
  }

  // Cancels the pending long-press timer if one exists.
  function clearLongPress() {
    if (!longPressTimer) return;
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  // Auto-scrolls the list viewport while dragging near its edges.
  function maybeAutoScrollWhileReordering(pointerY) {
    const rect = listViewportEl.getBoundingClientRect();
    const edge = 42;
    const step = 14;
    if (pointerY < rect.top + edge) {
      listViewportEl.scrollTop -= step;
    } else if (pointerY > rect.bottom - edge) {
      listViewportEl.scrollTop += step;
    }
  }
}

// Moves a todo to the top or bottom of its current due-date group.
function moveToGroupBoundary(sourceIndex, toTop) {
  const moved = todos[sourceIndex];
  if (!moved) return;
  const inSameGroup = (todo) => {
    if (isNoDue(moved)) return isNoDue(todo);
    return todo.dueDate === moved.dueDate;
  };
  const group = todos.filter(inSameGroup);
  if (!group.length) return;
  const withoutMoved = group.filter((t) => t.id !== moved.id);
  const reordered = toTop ? [moved, ...withoutMoved] : [...withoutMoved, moved];
  reordered.forEach((todo, i) => {
    todo.manualOrder = i + 1;
  });
  todos = normalizeTodoOrder(todos);
}


