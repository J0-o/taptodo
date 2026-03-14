// Renders the horizontal list tabs and wires tab interactions.
function renderTabs() {
  listTabsEl.innerHTML = '';
  lists.forEach((list) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'list-tab' + (list.id === activeListId ? ' active' : '');
    tab.textContent = list.name;
    tab.style.background = list.color;
    let pressTimer = null;
    let didLongPress = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;

    tab.addEventListener('pointerdown', (e) => {
      pointerId = e.pointerId;
      didLongPress = false;
      startX = e.clientX;
      startY = e.clientY;
      pressTimer = setTimeout(() => {
        didLongPress = true;
        tabEditListId = list.id;
        render();
      }, 420);
    });

    tab.addEventListener('pointermove', (e) => {
      if (pointerId !== e.pointerId || !pressTimer) return;
      if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    const clearPress = (e) => {
      if (pointerId !== e.pointerId) return;
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pointerId = null;
    };

    tab.addEventListener('pointerup', clearPress);
    tab.addEventListener('pointercancel', clearPress);

    tab.addEventListener('click', (e) => {
      if (didLongPress) {
        didLongPress = false;
        e.preventDefault();
        return;
      }
      switchList(list.id);
    });
    listTabsEl.append(tab);
  });
  updateActiveTabGlowAnchor();
}

// Binds native picker opening behavior to date and time inputs.
function bindNativePickerOpen(input) {
  if (!(input instanceof HTMLElement)) return;
  const openPicker = () => {
    if (input.disabled || input.readOnly) return;
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch (_err) {}
    }
    input.focus();
  };
  input.addEventListener('click', openPicker);
  input.addEventListener('pointerup', openPicker);
}

// Renders the active todo list, expanded rows, and modal state.
function render() {
  const previousActiveListId = activeListId;
  const previousScrollTop = listViewportEl.scrollTop;
  if (previousActiveListId) {
    listScrollByListId[previousActiveListId] = previousScrollTop;
  }

  ensureActiveList();
  applyActiveAccent();
  todos = normalizeTodoOrder(todos);
  persistActiveTodos();
  listEl.innerHTML = '';
  renderTabs();
  const ramps = getThemeListColors();
  const activeList = getActiveList();
  const colorIndex = Number.isFinite(activeList?.colorIndex) ? Number(activeList.colorIndex) : 0;
  const startHex = ramps.start.length ? ramps.start[colorIndex % ramps.start.length] : '';
  const endHex = ramps.end.length ? ramps.end[colorIndex % ramps.end.length] : startHex;
  const gradient = getEntryGradientPair(startHex, endHex);
  const BASE_GRADIENT_ENTRIES = 10;
  const gradientDenominator = todos.length > BASE_GRADIENT_ENTRIES
    ? Math.max(1, todos.length - 1)
    : (BASE_GRADIENT_ENTRIES - 1);

  todos.forEach((todo, index) => {
    const li = document.createElement('li');
    li.className = 'item' + (todo.complete ? ' complete' : '') + (expandedIndex === index ? ' expanded' : '');
    li.dataset.index = String(index);

    const t = Math.min(1, index / gradientDenominator);
    const r = Math.round(lerp(gradient.start.r, gradient.end.r, t));
    const g = Math.round(lerp(gradient.start.g, gradient.end.g, t));
    const b = Math.round(lerp(gradient.start.b, gradient.end.b, t));
    const lightR = Math.min(255, r + 18);
    const lightG = Math.min(255, g + 18);
    const lightB = Math.min(255, b + 18);
    li.style.setProperty('--entry-rgb', `${r}, ${g}, ${b}`);
    li.style.setProperty('--entry-rgb-light', `${lightR}, ${lightG}, ${lightB}`);
    li.style.background = `rgb(${r}, ${g}, ${b})`;
    li.style.borderColor = `rgb(${lightR}, ${lightG}, ${lightB})`;

    const main = document.createElement('div');
    main.className = 'item-main';

    const labelText = document.createElement('div');
    labelText.className = 'label';
    labelText.textContent = todo.text;
    const label = labelText;

    let editBtn = null;
    if (expandedIndex === index) {
      editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'task-edit-btn';
      editBtn.title = 'Edit task';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.innerHTML = '<span class="material-symbols-rounded">edit</span>';
      editBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        todoEditIndex = index;
        ignoreBackdropUntil = Date.now() + 220;
        render();
      });
    }

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'drag-handle';
    handle.title = 'Drag to reorder';
    handle.innerHTML = '<span class=\"material-symbols-rounded\">drag_indicator</span>';
    handle.setAttribute('aria-label', 'Drag to reorder');

    const dueTs = getDueTimestamp(todo);
    if (dueTs !== null) {
      const countdown = document.createElement('div');
      countdown.className = 'countdown';
      countdown.dataset.dueTs = String(dueTs);
      countdown.dataset.hasTime = todo.dueTime ? '1' : '0';
      countdown.dataset.todoIndex = String(index);
      if (editBtn) main.append(handle, label, editBtn, countdown);
      else main.append(handle, label, countdown);
    } else {
      if (editBtn) main.append(handle, label, editBtn);
      else main.append(handle, label);
    }

    li.append(main);

    if (expandedIndex === index) {
      li.append(buildSubbox(index, todo));
    }

    listEl.appendChild(li);
    attachGesture(li, main, handle, index);
  });

  renderModal();
  updateCountdowns();
  scheduleSave();

  const restoredScroll = listScrollByListId[activeListId];
  if (Number.isFinite(restoredScroll)) {
    listViewportEl.scrollTop = restoredScroll;
  }
}

// Returns the due timestamp for a todo, or null when none is set.
function getDueTimestamp(todo) {
  if (todo.dueDate && todo.dueTime) {
    const ts = new Date(`${todo.dueDate}T${todo.dueTime}`).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  if (todo.dueDate) {
    const ts = new Date(`${todo.dueDate}T23:59`).getTime();
    return Number.isNaN(ts) ? null : ts;
  }
  return null;
}

// Updates all visible countdown pills based on current time.
function updateCountdowns() {
  const now = Date.now();
  document.querySelectorAll('.countdown[data-due-ts]').forEach((el) => {
    const dueTs = Number(el.dataset.dueTs);
    if (!Number.isFinite(dueTs)) return;
    const todoIndex = Number(el.dataset.todoIndex);
    const todo = Number.isInteger(todoIndex) ? todos[todoIndex] : null;
    const isComplete = !!todo?.complete;
    const hasTime = el.dataset.hasTime === '1';
    const diff = dueTs - now;

    if (diff < 0) {
      if (!isComplete) {
        el.innerHTML = '<span class="count-pill overdue">Overdue</span>';
      } else {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const dueDay = new Date(dueTs);
        dueDay.setHours(0, 0, 0, 0);
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const daysAgo = Math.max(0, Math.round((startOfToday.getTime() - dueDay.getTime()) / MS_PER_DAY));
        if (daysAgo <= 0) {
          el.innerHTML = '<span class="count-pill">Today</span>';
        } else if (daysAgo === 1) {
          el.innerHTML = '<span class="count-pill">1 Day Ago</span>';
        } else {
          el.innerHTML = `<span class="count-pill">${daysAgo} Days Ago</span>`;
        }
      }
      return;
    }

    const { days, totalHours, mins } = getCountdownParts(diff);
    const pills = [];
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

    if (!hasTime) {
      if (days <= 0) pills.push('<span class="count-pill">Today</span>');
      else if (days === 1) pills.push('<span class="count-pill">Tomorrow</span>');
      else pills.push(`<span class="count-pill">${days} Days</span>`);
    } else if (diff > TWO_DAYS_MS) {
      pills.push(`<span class="count-pill">${days} Days</span>`);
    } else {
      if (totalHours > 0) pills.push(`<span class="count-pill">${totalHours} Hours</span>`);
      if (mins > 0 || !totalHours) pills.push(`<span class="count-pill">${mins} Mins</span>`);
    }

    el.innerHTML = pills.join('');
  });
}

// Renders the active modal for task, list, calendar, image, notes, or due-date editing.
function renderModal() {
  modalRoot.innerHTML = '';

  if (todoEditIndex !== null && todos[todoEditIndex]) {
    const todo = todos[todoEditIndex];
    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        todoEditIndex = null;
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal move-menu';
    const title = document.createElement('h3');
    title.textContent = 'Edit task';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'field';
    nameLabel.textContent = 'Task name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = todo.text || '';
    nameLabel.append(nameInput);

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (!todos[todoEditIndex]) return;
      todos.splice(todoEditIndex, 1);
      todoEditIndex = null;
      expandedIndex = null;
      render();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      todoEditIndex = null;
      render();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-secondary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const next = nameInput.value.trim();
      if (next && todos[todoEditIndex]) todos[todoEditIndex].text = next;
      todoEditIndex = null;
      render();
    });

    actionRow.append(deleteBtn, cancelBtn, saveBtn);
    modal.append(title, nameLabel, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    nameInput.focus();
    nameInput.select();
    return;
  }

  if (tabEditListId !== null) {
    const list = lists.find((l) => l.id === tabEditListId);
    if (!list) {
      tabEditListId = null;
      render();
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        tabEditListId = null;
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal move-menu';
    const title = document.createElement('h3');
    title.textContent = `Edit list: ${list.name}`;

    const nameLabel = document.createElement('label');
    nameLabel.className = 'field';
    nameLabel.textContent = 'List name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = list.name;
    nameLabel.append(nameInput);

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = lists.length <= 1;
    deleteBtn.addEventListener('click', () => {
      deleteList(list.id);
      tabEditListId = null;
      render();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      tabEditListId = null;
      render();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-secondary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => {
      const next = nameInput.value.trim();
      list.name = next;
      tabEditListId = null;
      render();
    });

    actionRow.append(deleteBtn, cancelBtn, saveBtn);
    modal.append(title, nameLabel, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    nameInput.focus();
    nameInput.select();
    return;
  }

  if (handleMoveMenuIndex !== null && todos[handleMoveMenuIndex]) {
    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        handleMoveMenuIndex = null;
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal move-menu';
    const title = document.createElement('h3');
    title.textContent = 'Reorder item';

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';

    const topBtn = document.createElement('button');
    topBtn.className = 'btn-secondary';
    topBtn.type = 'button';
    topBtn.textContent = 'Move to Top';
    topBtn.addEventListener('click', () => {
      moveToGroupBoundary(handleMoveMenuIndex, true);
      handleMoveMenuIndex = null;
      render();
    });

    const bottomBtn = document.createElement('button');
    bottomBtn.className = 'btn-secondary';
    bottomBtn.type = 'button';
    bottomBtn.textContent = 'Move to Bottom';
    bottomBtn.addEventListener('click', () => {
      moveToGroupBoundary(handleMoveMenuIndex, false);
      handleMoveMenuIndex = null;
      render();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      handleMoveMenuIndex = null;
      render();
    });

    actionRow.append(cancelBtn, topBtn, bottomBtn);
    modal.append(title, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    return;
  }

  if (quickCalendarOpen) {
    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        quickCalendarOpen = false;
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal';

    const title = document.createElement('h3');
    title.textContent = 'Pick due date and time';

    const now = new Date();
    const dateLabel = document.createElement('label');
    dateLabel.className = 'field';
    dateLabel.textContent = 'Date';
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = formatDateLocal(now);
    dateLabel.append(dateInput);

    const timeLabel = document.createElement('label');
    timeLabel.className = 'field';
    timeLabel.textContent = 'Time (optional)';
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.value = '';
    bindNativePickerOpen(dateInput);
    bindNativePickerOpen(timeInput);
    timeLabel.append(timeInput);

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      quickCalendarOpen = false;
      render();
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary';
    addBtn.type = 'button';
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
      const dateVal = dateInput.value;
      const timeVal = timeInput.value;
      addTodo(dateVal || '', timeVal || '');
      quickCalendarOpen = false;
      render();
      inputEl.focus();
    });

    actionRow.append(cancelBtn, addBtn);
    modal.append(title, dateLabel, timeLabel, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    dateInput.focus();
    return;
  }

  if (imagePreview && Number.isInteger(Number(imagePreview.todoIndex))) {
    const previewTodoIndex = Number(imagePreview.todoIndex);
    const requestedPreviewIndex = Number(imagePreview.imageIndex);
    const previewTodo = todos[previewTodoIndex];
    const previewImages = previewTodo && Array.isArray(previewTodo.images)
      ? previewTodo.images.filter((src) => typeof src === 'string' && src.trim())
      : [];
    const previewImageIndex = Number.isInteger(requestedPreviewIndex)
      ? Math.max(0, Math.min(requestedPreviewIndex, Math.max(0, previewImages.length - 1)))
      : 0;
    const currentSrc = previewImages[previewImageIndex] || '';
    const hasCurrentImage = !!currentSrc;
    const hasGallery = previewImages.length > 1 && Number.isInteger(previewImageIndex);

    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        closeImageViewer();
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal image-modal';

    const title = document.createElement('h3');
    if (hasCurrentImage && hasGallery) title.textContent = `Image ${previewImageIndex + 1} / ${previewImages.length}`;
    else if (hasCurrentImage) title.textContent = imagePreview.alt || 'Image';
    else title.textContent = 'Images';

    const previewSquare = document.createElement('div');
    previewSquare.className = 'modal-image-square';
    if (hasCurrentImage) {
      const imageStage = document.createElement('div');
      imageStage.className = 'modal-image-fit';
      imageStage.style.backgroundImage = `url("${String(currentSrc).replace(/"/g, '\\"')}")`;
      imageStage.setAttribute('role', 'img');
      imageStage.setAttribute('aria-label', imagePreview.alt || 'Image');
      const zoomPreview = document.createElement('div');
      zoomPreview.className = 'modal-zoom-preview';
      const clampPan = () => {
        const rect = previewSquare.getBoundingClientRect();
        const maxX = Math.max(0, ((imageZoom - 1) * rect.width) / 2);
        const maxY = Math.max(0, ((imageZoom - 1) * rect.height) / 2);
        imagePanX = Math.min(maxX, Math.max(-maxX, imagePanX));
        imagePanY = Math.min(maxY, Math.max(-maxY, imagePanY));
      };
      const applyImageZoom = () => {
        clampPan();
        imageStage.style.transform = `translate(${imagePanX}px, ${imagePanY}px) scale(${imageZoom})`;
        zoomPreview.textContent = `${Math.round(imageZoom * 100)}%`;
        previewSquare.style.cursor = imageZoom > 1 ? 'grab' : 'default';
      };
      applyImageZoom();
      let panPointerId = null;
      let panStartX = 0;
      let panStartY = 0;
      let panOriginX = 0;
      let panOriginY = 0;
      const activePointers = new Map();
      let pinchStartDistance = 0;
      let pinchStartZoom = 1;
      const clampZoom = (z) => Math.min(4, Math.max(1, Number(z.toFixed(2))));
      const getPinchDistance = () => {
        const pts = Array.from(activePointers.values());
        if (pts.length < 2) return 0;
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        return Math.hypot(dx, dy);
      };
      previewSquare.addEventListener('pointerdown', (e) => {
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size >= 2) {
          panPointerId = null;
          pinchStartDistance = getPinchDistance();
          pinchStartZoom = imageZoom;
          e.preventDefault();
          return;
        }
        if (imageZoom <= 1) return;
        panPointerId = e.pointerId;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panOriginX = imagePanX;
        panOriginY = imagePanY;
        previewSquare.setPointerCapture(e.pointerId);
        previewSquare.style.cursor = 'grabbing';
        e.preventDefault();
      });
      previewSquare.addEventListener('pointermove', (e) => {
        if (activePointers.has(e.pointerId)) {
          activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (activePointers.size >= 2 && pinchStartDistance > 0) {
          const dist = getPinchDistance();
          if (dist > 0) {
            imageZoom = clampZoom((dist / pinchStartDistance) * pinchStartZoom);
            if (imageZoom <= 1) {
              imagePanX = 0;
              imagePanY = 0;
            }
            applyImageZoom();
          }
          e.preventDefault();
          return;
        }
        if (panPointerId !== e.pointerId) return;
        imagePanX = panOriginX + (e.clientX - panStartX);
        imagePanY = panOriginY + (e.clientY - panStartY);
        applyImageZoom();
        e.preventDefault();
      });
      const stopPan = (e) => {
        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) pinchStartDistance = 0;
        if (panPointerId !== e.pointerId) return;
        try { previewSquare.releasePointerCapture(e.pointerId); } catch (_err) {}
        panPointerId = null;
        previewSquare.style.cursor = imageZoom > 1 ? 'grab' : 'default';
      };
      previewSquare.addEventListener('pointerup', stopPan);
      previewSquare.addEventListener('pointercancel', stopPan);
      previewSquare.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        imageZoom = clampZoom(imageZoom + delta);
        if (imageZoom <= 1) {
          imagePanX = 0;
          imagePanY = 0;
        }
        applyImageZoom();
      }, { passive: false });
      previewSquare.append(imageStage, zoomPreview);
    } else {
      const empty = document.createElement('div');
      empty.className = 'images-empty-label';
      empty.textContent = 'No images yet';
      previewSquare.append(empty);
    }

    let thumbsWrap = null;
    if (previewImages.length > 1) {
      thumbsWrap = document.createElement('div');
      thumbsWrap.className = 'thumbs-wrap';

      const leftBtn = document.createElement('button');
      leftBtn.className = 'btn-secondary thumbs-nav';
      leftBtn.type = 'button';
      leftBtn.textContent = '<';

      const rail = document.createElement('div');
      rail.className = 'thumbs-rail';
      const thumbScrollKey = String(previewTodoIndex);
      const savedThumbScroll = Number(imageThumbScrollByTodo[thumbScrollKey] || 0);
      if (savedThumbScroll > 0) {
        requestAnimationFrame(() => {
          rail.scrollLeft = savedThumbScroll;
        });
      }
      rail.addEventListener('scroll', () => {
        imageThumbScrollByTodo[thumbScrollKey] = rail.scrollLeft;
      });

      const track = document.createElement('div');
      track.className = 'thumbs-track';
      previewImages.forEach((thumbSrc, idx) => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'thumb-btn';
        if (idx === previewImageIndex) t.classList.add('active');
        t.title = `Image ${idx + 1}`;
        const ti = document.createElement('img');
        ti.className = 'thumb-img';
        ti.src = thumbSrc;
        ti.alt = `Image ${idx + 1}`;
        ti.loading = 'lazy';
        t.append(ti);
        t.addEventListener('click', () => {
          imageThumbScrollByTodo[thumbScrollKey] = rail.scrollLeft;
          openImageViewer(previewTodoIndex, idx, `Image ${idx + 1}`);
          imagePreview.src = thumbSrc;
          render();
        });
        track.append(t);
      });
      rail.append(track);

      const rightBtn = document.createElement('button');
      rightBtn.className = 'btn-secondary thumbs-nav';
      rightBtn.type = 'button';
      rightBtn.textContent = '>';

      leftBtn.addEventListener('click', () => {
        rail.scrollLeft -= 180;
      });
      rightBtn.addEventListener('click', () => {
        rail.scrollLeft += 180;
      });

      thumbsWrap.append(leftBtn, rail, rightBtn);
    }

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-secondary';
    addBtn.type = 'button';
    addBtn.textContent = 'Add image';
    addBtn.addEventListener('click', () => {
      pendingImageTodoIndex = previewTodoIndex;
      filePicker.click();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = !hasCurrentImage;
    deleteBtn.addEventListener('click', () => {
      const tIdx = Number(imagePreview?.todoIndex);
      const iIdx = Number(imagePreview?.imageIndex);
      const target = todos[tIdx];
      if (target && Array.isArray(target.images) && Number.isInteger(iIdx) && iIdx >= 0 && iIdx < target.images.length) {
        target.images.splice(iIdx, 1);
        if (target.images.length) {
          const nextIdx = Math.min(iIdx, target.images.length - 1);
          openImageViewer(tIdx, nextIdx, `Image ${nextIdx + 1}`);
          imagePreview.src = target.images[nextIdx];
          render();
          return;
        }
      }
      openImageViewer(tIdx, 0, 'Images');
      render();
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      closeImageViewer();
      render();
    });
    actionRow.append(deleteBtn, addBtn, closeBtn);

    if (thumbsWrap) modal.append(title, previewSquare, thumbsWrap, actionRow);
    else modal.append(title, previewSquare, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    return;
  }

  if (notesModalIndex !== null && todos[notesModalIndex]) {
    const todo = todos[notesModalIndex];
    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        notesModalIndex = null;
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal';

    const title = document.createElement('h3');
    title.textContent = `Notes: ${todo.text}`;

    const editor = document.createElement('textarea');
    editor.className = 'notes-editor';
    editor.value = todo.notes || '';
    editor.placeholder = 'Write notes...';
    editor.addEventListener('input', (e) => {
      todos[notesModalIndex].notes = e.target.value;
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      notesModalIndex = null;
      render();
    });
    actionRow.append(closeBtn);

    modal.append(title, editor, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    editor.focus();
    return;
  }

  if (dueModalIndex !== null && todos[dueModalIndex]) {
    const todo = todos[dueModalIndex];
    const backdrop = document.createElement('div');
    backdrop.className = 'notes-modal-backdrop';
    backdrop.addEventListener('click', (e) => {
      if (Date.now() < ignoreBackdropUntil) return;
      if (e.target === backdrop) {
        dueModalIndex = null;
        render();
      }
    });

    const modal = document.createElement('div');
    modal.className = 'notes-modal';

    const title = document.createElement('h3');
    title.textContent = `Due date: ${todo.text}`;

    const dueDateLabel = document.createElement('label');
    dueDateLabel.className = 'field';
    dueDateLabel.textContent = 'Date';
    const dueDateInput = document.createElement('input');
    dueDateInput.type = 'date';
    dueDateInput.value = todo.dueDate || '';

    const dueTimeLabel = document.createElement('label');
    dueTimeLabel.className = 'field';
    dueTimeLabel.textContent = 'Time';
    const dueTimeInput = document.createElement('input');
    dueTimeInput.type = 'time';
    dueTimeInput.value = todo.dueTime || '';
    dueTimeInput.disabled = !todo.dueDate;
    bindNativePickerOpen(dueDateInput);
    bindNativePickerOpen(dueTimeInput);

    const onDueDateValue = (e) => {
      const value = e.target.value;
      todos[dueModalIndex].dueDate = value;
      if (!value) {
        todos[dueModalIndex].dueTime = '';
        dueTimeInput.value = '';
        dueTimeInput.disabled = true;
      } else {
        dueTimeInput.disabled = false;
      }
      render();
    };
    dueDateInput.addEventListener('input', onDueDateValue);
    dueDateInput.addEventListener('change', onDueDateValue);

    const onDueTimeValue = (e) => {
      if (!todos[dueModalIndex].dueDate) {
        e.target.value = '';
        return;
      }
      todos[dueModalIndex].dueTime = e.target.value;
      render();
    };
    dueTimeInput.addEventListener('input', onDueTimeValue);
    dueTimeInput.addEventListener('change', onDueTimeValue);

    dueDateLabel.appendChild(dueDateInput);
    dueTimeLabel.appendChild(dueTimeInput);

    const actionRow = document.createElement('div');
    actionRow.className = 'notes-modal-actions';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-secondary';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      dueModalIndex = null;
      render();
    });
    actionRow.append(closeBtn);

    modal.append(title, dueDateLabel, dueTimeLabel, actionRow);
    backdrop.append(modal);
    modalRoot.append(backdrop);
    dueDateInput.focus();
  }
}

// Builds the expanded card strip for a todo row.
function buildSubbox(index, todo) {
  const box = document.createElement('div');
  box.className = 'subbox';

  const cardsStrip = document.createElement('div');
  cardsStrip.className = 'cards-strip';
  attachCardsInteraction(cardsStrip, index);

  const notesCard = document.createElement('div');
  notesCard.className = 'card';
  notesCard.dataset.cardType = 'notes';
  const notesTitle = document.createElement('div');
  notesTitle.className = 'card-title';
  notesTitle.textContent = 'Notes';
  const notesValue = document.createElement('div');
  notesValue.className = 'card-value';
  notesValue.textContent = (todo.notes || '').trim() || 'No notes yet.';
  notesCard.append(notesTitle, notesValue);

  const dueCard = document.createElement('div');
  dueCard.className = 'card';
  dueCard.dataset.cardType = 'due';
  const dueTitle = document.createElement('div');
  dueTitle.className = 'card-title';
  dueTitle.textContent = 'Due Date';
  const dueDisplay = document.createElement('div');
  dueDisplay.className = 'due-display';
  const dueDay = document.createElement('div');
  dueDay.className = 'due-day';
  dueDay.textContent = todo.dueDate || 'Any day';
  const dueTime = document.createElement('div');
  dueTime.className = 'due-time';
  dueTime.textContent = todo.dueTime || 'Any time';
  dueDisplay.append(dueDay, dueTime);
  dueCard.append(dueTitle, dueDisplay);

  const imagesCard = document.createElement('div');
  imagesCard.className = 'card';
  imagesCard.dataset.cardType = 'images';
  imagesCard.dataset.todoIndex = String(index);
  const validImages = Array.isArray(todo.images) ? todo.images.filter((src) => typeof src === 'string' && src.trim()) : [];
  const imageCount = validImages.length;
  if (imageCount) {
    imagesCard.classList.add('image-card');
    const previewWrap = document.createElement('div');
    previewWrap.className = 'images-card-preview';
    const previewImg = document.createElement('img');
    previewImg.className = 'card-image';
    previewImg.src = validImages[0];
    previewImg.alt = `${imageCount} image${imageCount === 1 ? '' : 's'}`;
    previewImg.loading = 'lazy';
    const countBadge = document.createElement('div');
    countBadge.className = 'images-card-count';
    countBadge.textContent = `${imageCount}`;
    previewWrap.append(previewImg, countBadge);
    imagesCard.append(previewWrap);
  } else {
    imagesCard.classList.add('image-card-empty');
    const imagesTitle = document.createElement('div');
    imagesTitle.className = 'card-title';
    imagesTitle.textContent = 'Images';
    const emptyLabel = document.createElement('div');
    emptyLabel.className = 'images-empty-label';
    emptyLabel.textContent = 'No images';
    imagesCard.append(imagesTitle, emptyLabel);
  }
  imagesCard.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const resolvedIndex = Number(imagesCard.dataset.todoIndex);
    const images = Array.isArray(todos[resolvedIndex]?.images)
      ? todos[resolvedIndex].images.filter((src) => typeof src === 'string' && src.trim())
      : [];
    const src = images[0] || '';
    ignoreBackdropUntil = Date.now() + 280;
    openImageViewer(resolvedIndex, 0, src ? 'Image 1' : 'Images');
    imagePreview.src = src;
    notesModalIndex = null;
    dueModalIndex = null;
    render();
  });
  cardsStrip.append(notesCard, dueCard, imagesCard);

  const hint = document.createElement('div');
  hint.className = 'cards-hint';
  hint.textContent = 'Tap a card to edit details.';

  box.append(cardsStrip, hint);
  return box;
}

// Handles card clicks for notes and due-date actions in an expanded todo row.
function attachCardsInteraction(strip, todoIndex) {
  strip.addEventListener('click', (e) => {
    const startCard = e.target.closest('.card');
    if (!startCard) return;
    const li = strip.closest('li[data-index]');
    const liveIndex = li ? Number(li.dataset.index) : todoIndex;
    const resolvedIndex = Number.isInteger(liveIndex) ? liveIndex : todoIndex;
    const cardType = startCard.dataset.cardType;
    if (cardType === 'notes') {
      ignoreBackdropUntil = Date.now() + 280;
      notesModalIndex = resolvedIndex;
      dueModalIndex = null;
      imagePreview = null;
      render();
    } else if (cardType === 'due') {
      ignoreBackdropUntil = Date.now() + 280;
      dueModalIndex = resolvedIndex;
      notesModalIndex = null;
      imagePreview = null;
      render();
    }
  });
}


