/**
 * SoundNotes - Main Application Logic
 * Исправлено: на экране ярлыков только кнопка "Убрать ярлык"
 */

document.addEventListener("DOMContentLoaded", () => {
    
    // ===== ПРОВЕРКА АВТОРИЗАЦИИ И ПОЛУЧЕНИЕ EMAIL =====
    const isAuth = localStorage.getItem("isAuth");
    const currentUserEmail = localStorage.getItem("currentUserEmail");
    if (!isAuth || !currentUserEmail) {
        window.location.href = "auth.html";
    }

    // ===== ПЕРЕМЕННЫЕ =====
    let notes = [];
    let trash = [];
    let labels = [];
    let currentLabelId = null;
    let pendingDeleteId = null;
    let currentNoteForLabel = null;
    let editingNoteId = null;

    // ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ КЛЮЧЕЙ LOCALSTORAGE =====
    function getStorageKey(base) {
        return `${base}_${currentUserEmail}`;
    }

    // ===== ДОМ ЭЛЕМЕНТЫ =====
    const notesScreen = document.getElementById("notesScreen");
    const trashScreen = document.getElementById("trashScreen");
    const settingsScreen = document.getElementById("settingsScreen");
    const helpScreen = document.getElementById("helpScreen");
    const labelsScreen = document.getElementById("labelsScreen");
    const labelNotesScreen = document.getElementById("labelNotesScreen");

    const burger = document.getElementById("burger");
    const sidebar = document.getElementById("sidebar");
    const trashBtn = document.getElementById("trashBtn");
    const notesBtn = document.getElementById("notesBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const helpBtn = document.getElementById("helpBtn");
    const labelsBtn = document.getElementById("labelsBtn");

    const collapsed = document.querySelector(".note-collapsed");
    const expanded = document.getElementById("expandedNote");
    const closeBtn = document.getElementById("closeNote");
    const addBtn = document.getElementById("addNote");
    const titleInputCollapsed = document.getElementById("noteTitle");
    const textInput = document.getElementById("noteText");
    const titleInputExpanded = document.getElementById("noteTitleExpanded");

    const collapsedLabel = document.querySelector(".note-collapsed-label");
    const expandedLabel = document.getElementById("expandedNoteLabel");
    const closeBtnLabel = document.getElementById("closeNoteLabel");
    const addBtnLabel = document.getElementById("addNoteLabel");
    const titleInputLabelCollapsed = document.getElementById("noteTitleLabel");
    const textInputLabel = document.getElementById("noteTextLabel");
    const titleInputExpandedLabel = document.getElementById("noteTitleExpandedLabel");

    const formatStyleSelect = document.getElementById("formatStyle");
    const formatStyleLabel = document.getElementById("formatStyleLabel");

    const notesGrid = document.getElementById("notesGrid");
    const trashGrid = document.getElementById("trashGrid");
    const labelNotesGrid = document.getElementById("labelNotesGrid");
    const searchInput = document.getElementById("searchInput");

    const confirmModal = document.getElementById("confirmModal");
    const modalCancel = document.getElementById("modalCancel");
    const modalConfirm = document.getElementById("modalConfirm");
    const modalNoteText = document.getElementById("modalNoteText");
    const addLabelModal = document.getElementById("addLabelModal");
    const modalLabelSelect = document.getElementById("modalLabelSelect");
    const modalAddLabelCancel = document.getElementById("modalAddLabelCancel");
    const modalAddLabelConfirm = document.getElementById("modalAddLabelConfirm");

    const profileWrapper = document.querySelector(".profile-wrapper");
    const profileBtn = document.getElementById("profileBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    const profileEmail = document.getElementById("profileEmail");
    const profileLetter = document.getElementById("profileLetter");
    const profileAvatar = document.getElementById("profileAvatar");
    const avatarInput = document.getElementById("avatarInput");
    const removeAvatarBtn = document.getElementById("removeAvatarBtn");

    const detailsToggle = document.getElementById("detailsToggle");
    const confirmDeleteToggle = document.getElementById("confirmDeleteToggle");

    const newLabelInput = document.getElementById("newLabelInput");
    const createLabelBtn = document.getElementById("createLabelBtn");
    const backToLabelsBtn = document.getElementById("backToLabelsBtn");
    const deleteCurrentLabelBtn = document.getElementById("deleteCurrentLabelBtn");

    // ===== АКТИВНЫЙ ИНДИКАТОР =====
    const activeIndicator = document.querySelector(".active_indicator");
    const menuItems = [notesBtn, labelsBtn, trashBtn, settingsBtn, helpBtn];

    function setActiveMenuItem(activeId) {
        menuItems.forEach(item => {
            if (item) item.classList.remove("active");
        });
        const activeElement = document.getElementById(activeId);
        if (activeElement) activeElement.classList.add("active");
        if (activeIndicator && activeElement) {
            const offsetTop = activeElement.offsetTop;
            activeIndicator.style.transform = `translateY(${offsetTop}px)`;
        }
    }

    // ===== ФУНКЦИИ ДАТЫ =====
    function getCurrentDateTime() {
        const now = new Date();
        return {
            timestamp: now.getTime(),
            formatted: `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
        };
    }
    function formatDate(timestamp) {
        const d = new Date(timestamp);
        return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }

    // ===== ОГРАНИЧЕНИЯ =====
    const MAX_TITLE_LEN = 32;
    const MAX_TEXT_LEN = 256;

    function limitInputField(field, maxLen) {
        if (!field) return;
        field.addEventListener('input', function() {
            if (this.value.length > maxLen) this.value = this.value.slice(0, maxLen);
        });
        field.addEventListener('paste', function(e) {
            setTimeout(() => {
                if (this.value.length > maxLen) this.value = this.value.slice(0, maxLen);
            }, 10);
        });
    }
    function limitContentEditable(editor, maxLen) {
        if (!editor) return;
        editor.addEventListener('input', function() {
            let text = this.innerText || '';
            if (text.length > maxLen) {
                this.innerText = text.slice(0, maxLen);
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(this);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
        editor.addEventListener('paste', function(e) {
            setTimeout(() => {
                let text = this.innerText || '';
                if (text.length > maxLen) {
                    this.innerText = text.slice(0, maxLen);
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(this);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }, 10);
        });
    }

    // ===== ФОРМАТИРОВАНИЕ =====
    function exec(cmd, value = null) {
        document.execCommand(cmd, false, value);
    }

    function applyJustify(align, editor) {
        editor.focus();
        if (align === 'left') exec('justifyLeft');
        else if (align === 'center') exec('justifyCenter');
        else if (align === 'right') exec('justifyRight');
        const sel = window.getSelection();
        if (sel.rangeCount) {
            let node = sel.getRangeAt(0).startContainer;
            while (node && node !== editor && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
            if (node && node !== editor) {
                node.style.textAlign = align;
            }
        }
    }

    function updateStyleSelect(editor, selectEl) {
        if (!selectEl) return;
        const tag = document.queryCommandValue('formatBlock');
        if (tag) {
            const name = tag.replace(/[<>]/g, '').toLowerCase();
            if (name === 'h1') selectEl.value = 'h1';
            else if (name === 'h2') selectEl.value = 'h2';
            else if (name === 'h3') selectEl.value = 'h3';
            else selectEl.value = 'p';
        } else selectEl.value = 'p';
    }

    function applyHeading(selectEl, editor) {
        const val = selectEl.value;
        let tag = 'p';
        if (val === 'h1') tag = 'h1';
        else if (val === 'h2') tag = 'h2';
        else if (val === 'h3') tag = 'h3';
        editor.focus();
        exec('formatBlock', `<${tag}>`);
        setTimeout(() => updateStyleSelect(editor, selectEl), 10);
    }

    // ===== РЕДАКТИРОВАНИЕ =====
    function openEditorForNote(note) {
        editingNoteId = note.id;
        if (titleInputExpanded) titleInputExpanded.value = note.title || '';
        else titleInputCollapsed.value = note.title || '';
        textInput.innerHTML = note.text || '';
        addBtn.textContent = "Сохранить изменения";
        addBtn.style.backgroundColor = "#ffffff";
        collapsed.style.display = "none";
        expanded.style.display = "flex";
        if (titleInputExpanded) titleInputExpanded.focus();
        else titleInputCollapsed.focus();
    }

    function cancelEditing() {
        editingNoteId = null;
        addBtn.textContent = "Добавить";
        addBtn.style.backgroundColor = "";
        clearInputs();
    }

    // ===== ОБЩИЕ ФУНКЦИИ =====
    function clearInputs() {
        if (titleInputCollapsed) titleInputCollapsed.value = "";
        if (titleInputExpanded) titleInputExpanded.value = "";
        if (textInput) textInput.innerHTML = "";
        if (titleInputLabelCollapsed) titleInputLabelCollapsed.value = "";
        if (titleInputExpandedLabel) titleInputExpandedLabel.value = "";
        if (textInputLabel) textInputLabel.innerHTML = "";
    }

    function saveToStorage() {
        localStorage.setItem(getStorageKey("notes"), JSON.stringify(notes));
        localStorage.setItem(getStorageKey("trash"), JSON.stringify(trash));
        localStorage.setItem(getStorageKey("labels"), JSON.stringify(labels));
        localStorage.setItem("search", searchInput.value);
    }

    function loadFromStorage() {
        const savedNotes = localStorage.getItem(getStorageKey("notes"));
        const savedTrash = localStorage.getItem(getStorageKey("trash"));
        const savedLabels = localStorage.getItem(getStorageKey("labels"));
        notes = savedNotes ? JSON.parse(savedNotes) : [];
        trash = savedTrash ? JSON.parse(savedTrash) : [];
        labels = savedLabels ? JSON.parse(savedLabels) : [];
        notes.forEach(note => {
            if (!note.labels) note.labels = [];
            if (!note.createdAt) note.createdAt = Date.now();
            if (!note.updatedAt) note.updatedAt = note.createdAt;
        });
        trash.forEach(note => {
            if (!note.createdAt) note.createdAt = Date.now();
            if (!note.updatedAt) note.updatedAt = note.createdAt;
        });
    }

    function escapeHtml(str) {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function highlightText(text, query) {
        if (!query || !text) return text || "";
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQuery})`, "gi");
        return text.replace(regex, `<span class="highlight">$1</span>`);
    }

    function isDetailsEnabled() {
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        return settings.details || false;
    }

    function isConfirmDeleteEnabled() {
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        return settings.confirmDelete !== false;
    }

    // ===== РЕНДЕРИНГ ЗАМЕТОК =====
    function renderNotes(filter = "") {
        notesGrid.innerHTML = "";
        const filtered = notes.filter(note => {
            const searchText = ((note.title || "") + " " + (note.text || "")).toLowerCase();
            return searchText.includes(filter.toLowerCase());
        });
        if (filtered.length === 0) {
            notesGrid.innerHTML = `<p class="empty-state">Нет заметок</p>`;
            return;
        }
        const detailsEnabled = isDetailsEnabled();
        filtered.forEach(note => {
            const el = document.createElement("div");
            el.classList.add("note-card");
            el.dataset.id = note.id;

            const title = note.title || "Без названия";
            const text = note.text || "";
            const titleHtml = highlightText(title, filter);
            let textHtml = text;
            if (filter && text) {
                const plainText = text.replace(/<[^>]*>/g, '');
                if (plainText.toLowerCase().includes(filter.toLowerCase())) textHtml = text;
            }
            const dateStr = note.updatedAt ? formatDate(note.updatedAt) : formatDate(note.createdAt);
            const dateHtml = `<div class="note-date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>`;

            let labelsHtml = "";
            if (note.labels && note.labels.length) {
                labelsHtml = `<div class="note-labels">${note.labels.map(labelId => {
                    const label = labels.find(l => l.id == labelId);
                    return label ? `<span class="label-tag" data-label-id="${label.id}">${escapeHtml(label.name)}</span>` : '';
                }).join('')}</div>`;
            }

            if (detailsEnabled) {
                el.innerHTML = `
                    <h3>${titleHtml}</h3>
                    ${dateHtml}
                    <div class="note-content note-text expanded">${textHtml || '<em>Пустая заметка</em>'}</div>
                    ${labelsHtml}
                    <div class="note-card-actions">
                        <button class="edit-btn" data-id="${note.id}" title="Редактировать">Редактировать</button>
                        <button class="delete-btn" data-id="${note.id}" title="Удалить">Удалить</button>
                        <button class="add-label-btn" data-id="${note.id}" title="Добавить ярлык">Ярлык</button>
                    </div>
                `;
            } else {
                const plainText = text ? text.replace(/<[^>]*>/g, '').substring(0, 100) : "";
                el.innerHTML = `
                    <h3>${titleHtml}</h3>
                    ${dateHtml}
                    <p class="note-text truncated">${escapeHtml(plainText)}${plainText.length >= 100 ? '...' : ''}</p>
                    ${labelsHtml}
                    <div class="note-card-actions">
                        <button class="edit-btn" data-id="${note.id}" title="Редактировать"><i class="fas fa-pen"></i> Редактировать</button>
                        <button class="delete-btn" data-id="${note.id}" title="Удалить"><i class="fas fa-trash"></i> Удалить</button>
                        <button class="add-label-btn" data-id="${note.id}" title="Добавить ярлык"><i class="fas fa-tag"></i> Ярлык</button>
                    </div>
                `;
            }
            notesGrid.appendChild(el);
        });
    }

    function deleteNoteById(id) {
        const index = notes.findIndex(n => n.id === id);
        if (index !== -1) {
            const [removed] = notes.splice(index, 1);
            trash.push(removed);
            saveToStorage();
            if (trashScreen.style.display !== "none") {
                renderTrash();
            }
        }
        renderNotes(searchInput.value);
        if (currentLabelId) renderLabelNotes(searchInput.value);
    }

    function saveOrUpdateNote(title, text) {
        if (editingNoteId !== null) {
            const index = notes.findIndex(n => n.id === editingNoteId);
            if (index !== -1) {
                notes[index].title = escapeHtml(title);
                notes[index].text = text === "<br>" ? "" : text;
                notes[index].updatedAt = Date.now();
                saveToStorage();
            }
            cancelEditing();
        } else {
            const now = getCurrentDateTime();
            const note = {
                id: Date.now(),
                order: Date.now(),
                title: escapeHtml(title),
                text: text === "<br>" ? "" : text,
                labels: [],
                createdAt: now.timestamp,
                updatedAt: now.timestamp
            };
            notes.push(note);
            saveToStorage();
        }
        renderNotes(searchInput.value);
        if (currentLabelId) renderLabelNotes(searchInput.value);
    }

    // ===== ФОРМАТИРОВАНИЕ: ИНИЦИАЛИЗАЦИЯ =====
    let formattingReady = false;
    function initFormatting() {
        if (formattingReady) return;
        formattingReady = true;

        if (formatStyleSelect && textInput) {
            formatStyleSelect.addEventListener("change", (e) => {
                e.preventDefault();
                applyHeading(formatStyleSelect, textInput);
            });
            textInput.addEventListener("click", () => updateStyleSelect(textInput, formatStyleSelect));
            textInput.addEventListener("keyup", () => updateStyleSelect(textInput, formatStyleSelect));
        }

        const toolbar = document.querySelector("#expandedNote .formatting-toolbar");
        if (toolbar) {
            const btns = toolbar.querySelectorAll("button[data-command]");
            btns.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const cmd = newBtn.dataset.command;
                    textInput.focus();
                    switch(cmd) {
                        case 'bold': exec('bold'); break;
                        case 'italic': exec('italic'); break;
                        case 'underline': exec('underline'); break;
                        case 'strikeThrough': exec('strikeThrough'); break;
                        case 'justifyLeft': applyJustify('left', textInput); break;
                        case 'justifyCenter': applyJustify('center', textInput); break;
                        case 'justifyRight': applyJustify('right', textInput); break;
                        case 'removeFormat': exec('removeFormat'); break;
                        default: exec(cmd);
                    }
                    setTimeout(() => updateStyleSelect(textInput, formatStyleSelect), 10);
                });
            });
        }

        if (formatStyleLabel && textInputLabel) {
            formatStyleLabel.addEventListener("change", (e) => {
                e.preventDefault();
                applyHeading(formatStyleLabel, textInputLabel);
            });
            textInputLabel.addEventListener("click", () => updateStyleSelect(textInputLabel, formatStyleLabel));
            textInputLabel.addEventListener("keyup", () => updateStyleSelect(textInputLabel, formatStyleLabel));
        }
        const toolbarLabel = document.querySelector("#expandedNoteLabel .formatting-toolbar");
        if (toolbarLabel) {
            const btnsLabel = toolbarLabel.querySelectorAll("button[data-command]");
            btnsLabel.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    const cmd = newBtn.dataset.command;
                    textInputLabel.focus();
                    switch(cmd) {
                        case 'bold': exec('bold'); break;
                        case 'italic': exec('italic'); break;
                        case 'underline': exec('underline'); break;
                        case 'strikeThrough': exec('strikeThrough'); break;
                        case 'justifyLeft': applyJustify('left', textInputLabel); break;
                        case 'justifyCenter': applyJustify('center', textInputLabel); break;
                        case 'justifyRight': applyJustify('right', textInputLabel); break;
                        case 'removeFormat': exec('removeFormat'); break;
                        default: exec(cmd);
                    }
                    setTimeout(() => updateStyleSelect(textInputLabel, formatStyleLabel), 10);
                });
            });
        }

        if (textInput) {
            textInput.addEventListener("keydown", (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key.toLowerCase()) {
                        case 'b': e.preventDefault(); exec('bold'); break;
                        case 'i': e.preventDefault(); exec('italic'); break;
                        case 'u': e.preventDefault(); exec('underline'); break;
                    }
                }
            });
        }
        if (textInputLabel) {
            textInputLabel.addEventListener("keydown", (e) => {
                if (e.ctrlKey || e.metaKey) {
                    switch(e.key.toLowerCase()) {
                        case 'b': e.preventDefault(); exec('bold'); break;
                        case 'i': e.preventDefault(); exec('italic'); break;
                        case 'u': e.preventDefault(); exec('underline'); break;
                    }
                }
            });
        }
    }

    // ===== ТЕМА =====
    function initTheme() {
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        let theme = settings.theme || "darkTheme";
        if (theme === "systemTheme") {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = isDark ? "darkTheme" : "lightTheme";
        }
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add(theme === "lightTheme" ? "light-theme" : "dark-theme");
        const themeRadio = document.getElementById(theme);
        if (themeRadio) themeRadio.checked = true;
        return theme;
    }

    function applyTheme(themeId) {
        let effectiveTheme = themeId;
        if (themeId === "systemTheme") {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            effectiveTheme = isDark ? "darkTheme" : "lightTheme";
        }
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add(effectiveTheme === "lightTheme" ? "light-theme" : "dark-theme");
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        settings.theme = themeId;
        localStorage.setItem("settings", JSON.stringify(settings));
        const searchValue = searchInput ? searchInput.value : "";
        renderNotes(searchValue);
        if (trashScreen && trashScreen.style.display !== "none") renderTrash();
        if (labelNotesGrid && labelNotesGrid.style.display !== "none") renderLabelNotes(searchValue);
    }

    function setupThemeListeners() {
        const lightTheme = document.getElementById("lightTheme");
        const darkTheme = document.getElementById("darkTheme");
        const systemTheme = document.getElementById("systemTheme");
        if (lightTheme) lightTheme.addEventListener("change", (e) => { if (e.target.checked) applyTheme("lightTheme"); });
        if (darkTheme) darkTheme.addEventListener("change", (e) => { if (e.target.checked) applyTheme("darkTheme"); });
        if (systemTheme) systemTheme.addEventListener("change", (e) => { if (e.target.checked) applyTheme("systemTheme"); });
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                const settings = JSON.parse(localStorage.getItem("settings")) || {};
                if (settings.theme === "systemTheme") applyTheme("systemTheme");
            });
        }
    }

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem("settings")) || {};
        if (settings.details !== undefined) detailsToggle.checked = settings.details;
        if (settings.confirmDelete !== undefined) confirmDeleteToggle.checked = settings.confirmDelete;
    }

    function saveSettings() {
        const settings = {
            details: detailsToggle.checked,
            confirmDelete: confirmDeleteToggle.checked,
            theme: document.querySelector('input[name="theme"]:checked')?.id || "darkTheme"
        };
        localStorage.setItem("settings", JSON.stringify(settings));
    }

    // ===== ПРОФИЛЬ И АВАТАР =====
    function loadAvatar() {
        const savedAvatar = localStorage.getItem("profileAvatar");
        if (savedAvatar) {
            profileAvatar.src = savedAvatar;
            profileAvatar.classList.remove("hidden");
            profileLetter.classList.add("hidden");
        } else {
            profileAvatar.classList.add("hidden");
            profileLetter.classList.remove("hidden");
        }
    }

    // ===== КОРЗИНА =====
    function renderTrash() {
        trashGrid.innerHTML = "";
        if (trash.length === 0) {
            trashGrid.innerHTML = `<p class="empty-state">Корзина пуста</p>`;
            return;
        }
        const detailsEnabled = isDetailsEnabled();
        trash.forEach(note => {
            const el = document.createElement("div");
            el.classList.add("note-card");
            const textClass = detailsEnabled ? "expanded" : "truncated";
            const text = (note.text || "").replace(/<[^>]*>/g, '');
            const dateStr = note.updatedAt ? formatDate(note.updatedAt) : formatDate(note.createdAt);
            el.innerHTML = `
                <h3>${escapeHtml(note.title || "Без названия")}</h3>
                <div class="note-date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>
                <p class="note-text ${textClass}">${escapeHtml(text)}</p>
                <div class="trash-actions">
                    <button class="restore-btn" data-id="${note.id}">Восстановить</button>
                    <button class="delete-forever-btn" data-id="${note.id}">Удалить навсегда</button>
                </div>
            `;
            trashGrid.appendChild(el);
        });
    }

    // ===== ЯРЛЫКИ =====
    function renderLabelsList() {
        const container = document.getElementById("labelsList");
        if (!container) return;
        container.innerHTML = "";
        if (labels.length === 0) {
            container.innerHTML = `<p class="empty-state">Нет ярлыков. Создайте первый!</p>`;
            return;
        }
        labels.forEach(label => {
            const div = document.createElement("div");
            div.classList.add("label-item");
            div.innerHTML = `
                <span class="label-name" data-id="${label.id}">${escapeHtml(label.name)}</span>
                <button class="delete-label-btn" data-id="${label.id}">Удалить</button>
            `;
            container.appendChild(div);
        });
        document.querySelectorAll(".label-name").forEach(el => {
            el.addEventListener("click", () => {
                const id = Number(el.dataset.id);
                currentLabelId = id;
                searchInput.value = "";
                renderLabelNotes();
                localStorage.setItem("search", "");
                showScreen(labelNotesScreen);
                if (backToLabelsBtn) backToLabelsBtn.style.display = "inline-block";
                if (deleteCurrentLabelBtn) deleteCurrentLabelBtn.style.display = "inline-block";
            });
        });
        document.querySelectorAll(".delete-label-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const id = Number(btn.dataset.id);
                deleteLabelById(id);
            });
        });
    }

    function deleteLabelById(labelId) {
        labels = labels.filter(l => l.id !== labelId);
        notes.forEach(note => {
            if (note.labels) note.labels = note.labels.filter(l => l !== labelId);
        });
        saveToStorage();
        if (currentLabelId === labelId) {
            currentLabelId = null;
            showScreen(labelsScreen);
        }
        renderLabelsList();
        renderNotes(searchInput.value);
    }

    // ===== ИЗМЕНЁННАЯ ФУНКЦИЯ РЕНДЕРИНГА ЗАМЕТОК ПО ЯРЛЫКУ (БЕЗ КНОПКИ "УДАЛИТЬ") =====
    function renderLabelNotes(filter = "") {
        if (!labelNotesGrid) return;
        labelNotesGrid.innerHTML = "";
        if (!currentLabelId) return;
        const label = labels.find(l => l.id == currentLabelId);
        if (!label) {
            labelNotesGrid.innerHTML = `<p class="empty-state">Ярлык не найден</p>`;
            return;
        }
        let filteredNotes = notes.filter(note => note.labels && note.labels.includes(currentLabelId));
        if (filter) {
            filteredNotes = filteredNotes.filter(note => {
                const text = ((note.title || "") + " " + (note.text || "")).toLowerCase();
                return text.includes(filter.toLowerCase());
            });
        }
        if (filteredNotes.length === 0) {
            labelNotesGrid.innerHTML = `<p class="empty-state">Нет заметок с этим ярлыком</p>`;
            return;
        }
        const detailsEnabled = isDetailsEnabled();
        filteredNotes.forEach(note => {
            const el = document.createElement("div");
            el.classList.add("note-card");
            el.dataset.id = note.id;

            const title = note.title || "Без названия";
            const text = note.text || "";
            const titleHtml = highlightText(title, filter);
            let textHtml = text;
            if (filter && text) {
                const plainText = text.replace(/<[^>]*>/g, '');
                if (plainText.toLowerCase().includes(filter.toLowerCase())) textHtml = text;
            }
            const dateStr = note.updatedAt ? formatDate(note.updatedAt) : formatDate(note.createdAt);
            const dateHtml = `<div class="note-date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>`;
            if (detailsEnabled) {
                el.innerHTML = `
                    <h3>${titleHtml}</h3>
                    ${dateHtml}
                    <div class="note-content note-text expanded">${textHtml || '<em>Пустая заметка</em>'}</div>
                    <div class="note-card-actions-vertical">
                        <button class="remove-label-btn" data-id="${note.id}">Убрать ярлык</button>
                    </div>
                `;
            } else {
                const plainText = text ? text.replace(/<[^>]*>/g, '').substring(0, 100) : "";
                el.innerHTML = `
                    <h3>${titleHtml}</h3>
                    ${dateHtml}
                    <p class="note-text truncated">${escapeHtml(plainText)}${plainText.length >= 100 ? '...' : ''}</p>
                    <div class="note-card-actions-vertical">
                        <button class="remove-label-btn" data-id="${note.id}">Убрать ярлык</button>
                    </div>
                `;
            }
            labelNotesGrid.appendChild(el);
        });
    }

    // ===== НАВИГАЦИЯ =====
    function showScreen(screen) {
        [notesScreen, trashScreen, settingsScreen, helpScreen, labelsScreen, labelNotesScreen].forEach(s => {
            if (s) s.style.display = "none";
        });
        if (screen) screen.style.display = "block";
    }

    function handleNavClick(event, screen, screenId, refreshCallback) {
        event.preventDefault();
        showScreen(screen);
        setActiveMenuItem(screenId);
        if (refreshCallback && typeof refreshCallback === "function") {
            refreshCallback();
        }
    }

    // ===== СОБЫТИЯ ИНТЕРФЕЙСА =====
    limitInputField(titleInputExpanded, MAX_TITLE_LEN);
    limitInputField(titleInputCollapsed, MAX_TITLE_LEN);
    limitContentEditable(textInput, MAX_TEXT_LEN);
    limitInputField(titleInputExpandedLabel, MAX_TITLE_LEN);
    limitInputField(titleInputLabelCollapsed, MAX_TITLE_LEN);
    limitContentEditable(textInputLabel, MAX_TEXT_LEN);

    burger.addEventListener("click", () => sidebar.classList.toggle("closed"));
    document.querySelectorAll("#logoutBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            localStorage.removeItem("isAuth");
            localStorage.removeItem("currentUserEmail");
            window.location.href = "auth.html";
        });
    });

    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) {
        profileEmail.textContent = savedUser.email;
        profileLetter.textContent = savedUser.email[0].toUpperCase();
    }
    profileBtn.addEventListener("click", () => profileDropdown.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
        if (!profileWrapper.contains(e.target)) profileDropdown.classList.add("hidden");
    });

    avatarInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Файл слишком большой. Максимальный размер: 2MB");
            return;
        }
        if (!file.type.match(/image\/(png|jpg|jpeg|gif|webp)/)) {
            alert("Поддерживаются только изображения: PNG, JPG, JPEG, GIF, WebP");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const imageData = event.target.result;
            const img = new Image();
            img.onload = () => {
                if (img.width > 300 || img.height > 300) {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const ratio = Math.min(300 / img.width, 300 / img.height);
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const optimizedData = canvas.toDataURL("image/jpeg", 0.8);
                    localStorage.setItem("profileAvatar", optimizedData);
                } else {
                    localStorage.setItem("profileAvatar", imageData);
                }
                loadAvatar();
                profileDropdown.classList.add("hidden");
            };
            img.src = imageData;
        };
        reader.readAsDataURL(file);
    });
    removeAvatarBtn.addEventListener("click", () => {
        localStorage.removeItem("profileAvatar");
        loadAvatar();
        profileDropdown.classList.add("hidden");
    });

    collapsed.addEventListener("click", () => {
        cancelEditing();
        collapsed.style.display = "none";
        expanded.style.display = "flex";
        if (titleInputExpanded) titleInputExpanded.focus();
        else titleInputCollapsed.focus();
    });
    closeBtn.addEventListener("click", () => {
        expanded.style.display = "none";
        collapsed.style.display = "block";
        cancelEditing();
        clearInputs();
    });
    addBtn.addEventListener("click", () => {
        let title = titleInputExpanded ? titleInputExpanded.value.trim() : titleInputCollapsed.value.trim();
        const text = textInput.innerHTML;
        if (!title && (!text || text === "<br>" || text === "")) {
            alert("Заголовок или текст не могут быть пустыми");
            return;
        }
        if (title.length > MAX_TITLE_LEN) title = title.slice(0, MAX_TITLE_LEN);
        saveOrUpdateNote(title, text);
        clearInputs();
        expanded.style.display = "none";
        collapsed.style.display = "block";
    });

    collapsedLabel.addEventListener("click", () => {
        collapsedLabel.style.display = "none";
        expandedLabel.style.display = "flex";
        if (titleInputExpandedLabel) titleInputExpandedLabel.focus();
        else titleInputLabelCollapsed.focus();
    });
    closeBtnLabel.addEventListener("click", () => {
        expandedLabel.style.display = "none";
        collapsedLabel.style.display = "block";
        clearInputs();
    });
    addBtnLabel.addEventListener("click", () => {
        let title = titleInputExpandedLabel ? titleInputExpandedLabel.value.trim() : titleInputLabelCollapsed.value.trim();
        const text = textInputLabel.innerHTML;
        if (!title && (!text || text === "<br>" || text === "")) return;
        const now = getCurrentDateTime();
        const note = {
            id: Date.now(),
            order: Date.now(),
            title: escapeHtml(title),
            text: text === "<br>" ? "" : text,
            labels: currentLabelId ? [currentLabelId] : [],
            createdAt: now.timestamp,
            updatedAt: now.timestamp
        };
        notes.push(note);
        saveToStorage();
        renderLabelNotes(searchInput.value);
        renderNotes(searchInput.value);
        clearInputs();
        expandedLabel.style.display = "none";
        collapsedLabel.style.display = "block";
    });

    notesGrid.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".edit-btn");
        if (editBtn) {
            const id = Number(editBtn.dataset.id);
            const note = notes.find(n => n.id === id);
            if (note) openEditorForNote(note);
            return;
        }
        if (e.target.classList.contains("delete-btn") || e.target.closest(".delete-btn")) {
            const btn = e.target.classList.contains("delete-btn") ? e.target : e.target.closest(".delete-btn");
            const id = Number(btn.dataset.id);
            if (isConfirmDeleteEnabled()) {
                const note = notes.find(n => n.id === id);
                if (note) {
                    const preview = note.title || (note.text || "").replace(/<[^>]*>/g, '').substring(0, 50) || "Без названия";
                    modalNoteText.textContent = `Вы уверены, что хотите удалить заметку "${preview}${preview.length >= 50 ? '...' : ''}"?`;
                }
                pendingDeleteId = id;
                confirmModal.style.display = "flex";
                confirmModal.classList.remove("hidden");
            } else {
                deleteNoteById(id);
            }
            return;
        }
        if (e.target.classList.contains("add-label-btn") || e.target.closest(".add-label-btn")) {
            const btn = e.target.classList.contains("add-label-btn") ? e.target : e.target.closest(".add-label-btn");
            const id = Number(btn.dataset.id);
            currentNoteForLabel = id;
            modalLabelSelect.innerHTML = '<option value="">Выберите ярлык</option>';
            labels.forEach(label => {
                const option = document.createElement("option");
                option.value = label.id;
                option.textContent = escapeHtml(label.name);
                modalLabelSelect.appendChild(option);
            });
            addLabelModal.style.display = "flex";
            addLabelModal.classList.remove("hidden");
            return;
        }
        if (e.target.classList.contains("label-tag")) {
            const labelId = Number(e.target.dataset.labelId);
            const label = labels.find(l => l.id == labelId);
            if (label) {
                currentLabelId = labelId;
                searchInput.value = "";
                renderLabelNotes();
                localStorage.setItem("search", "");
                showScreen(labelNotesScreen);
                if (backToLabelsBtn) backToLabelsBtn.style.display = "inline-block";
                if (deleteCurrentLabelBtn) deleteCurrentLabelBtn.style.display = "inline-block";
            }
        }
    });

    modalCancel.addEventListener("click", () => {
        confirmModal.style.display = "none";
        confirmModal.classList.add("hidden");
        pendingDeleteId = null;
    });
    modalConfirm.addEventListener("click", () => {
        if (pendingDeleteId !== null) {
            deleteNoteById(pendingDeleteId);
            if (currentLabelId) renderLabelNotes();
        }
        confirmModal.style.display = "none";
        confirmModal.classList.add("hidden");
        pendingDeleteId = null;
    });
    modalAddLabelCancel.addEventListener("click", () => {
        addLabelModal.style.display = "none";
        addLabelModal.classList.add("hidden");
        currentNoteForLabel = null;
    });
    modalAddLabelConfirm.addEventListener("click", () => {
        const selectedLabelId = parseInt(modalLabelSelect.value);
        if (selectedLabelId && currentNoteForLabel !== null) {
            const note = notes.find(n => n.id == currentNoteForLabel);
            if (note && !note.labels.includes(selectedLabelId)) {
                note.labels.push(selectedLabelId);
                note.updatedAt = Date.now();
                saveToStorage();
                renderNotes(searchInput.value);
            }
        }
        addLabelModal.style.display = "none";
        addLabelModal.classList.add("hidden");
        currentNoteForLabel = null;
    });

    // ОБРАБОТЧИК ДЛЯ ЗАМЕТОК ПО ЯРЛЫКУ (только кнопка "Убрать ярлык")
    labelNotesGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".remove-label-btn");
        if (btn) {
            const id = Number(btn.dataset.id);
            const note = notes.find(n => n.id === id);
            if (note && currentLabelId && Array.isArray(note.labels)) {
                note.labels = note.labels.filter(l => l !== currentLabelId);
                saveToStorage();
                renderLabelNotes(searchInput.value);
                renderNotes(searchInput.value);
            }
            return;
        }
    });

    trashGrid.addEventListener("click", (e) => {
        const id = Number(e.target.dataset.id);
        if (e.target.classList.contains("restore-btn")) {
            const index = trash.findIndex(n => n.id === id);
            if (index !== -1) {
                const [restored] = trash.splice(index, 1);
                restored.updatedAt = Date.now();
                notes.push(restored);
                saveToStorage();
                renderTrash();
                renderNotes(searchInput.value);
            }
        }
        if (e.target.classList.contains("delete-forever-btn")) {
            trash = trash.filter(n => n.id !== id);
            saveToStorage();
            renderTrash();
        }
    });

    if (createLabelBtn) {
        createLabelBtn.addEventListener("click", () => {
            let name = newLabelInput.value.trim();
            if (!name) {
                alert("Название ярлыка не может быть пустым");
                return;
            }
            if (name.length > 30) {
                alert("Название ярлыка не должно превышать 30 символов");
                name = name.slice(0, 30);
            }
            if (labels.some(l => l.name.toLowerCase() === name.toLowerCase())) {
                alert("Такой ярлык уже существует");
                return;
            }
            const newLabel = { id: Date.now(), name: escapeHtml(name) };
            labels.push(newLabel);
            saveToStorage();
            renderLabelsList();
            newLabelInput.value = "";
        });
    }
    
    if (backToLabelsBtn) {
        backToLabelsBtn.addEventListener("click", () => {
            currentLabelId = null;
            showScreen(labelsScreen);
            renderLabelsList();
            setActiveMenuItem("labelsBtn");
        });
    }
    if (deleteCurrentLabelBtn) {
        deleteCurrentLabelBtn.addEventListener("click", () => {
            if (currentLabelId && confirm("Удалить этот ярлык? Он исчезнет из всех заметок.")) {
                deleteLabelById(currentLabelId);
                currentLabelId = null;
                showScreen(labelsScreen);
                renderLabelsList();
                setActiveMenuItem("labelsBtn");
            }
        });
    }

    detailsToggle?.addEventListener("change", () => {
        saveSettings();
        renderNotes(searchInput.value);
        if (trashScreen.style.display !== "none") renderTrash();
    });
    confirmDeleteToggle?.addEventListener("change", saveSettings);

    trashBtn.addEventListener("click", (e) => handleNavClick(e, trashScreen, "trashBtn", () => renderTrash()));
    notesBtn.addEventListener("click", (e) => handleNavClick(e, notesScreen, "notesBtn", () => {
        const ss = localStorage.getItem("search") || "";
        searchInput.value = ss;
        renderNotes(ss);
    }));
    settingsBtn.addEventListener("click", (e) => handleNavClick(e, settingsScreen, "settingsBtn", null));
    helpBtn.addEventListener("click", (e) => handleNavClick(e, helpScreen, "helpBtn", null));
    labelsBtn.addEventListener("click", (e) => handleNavClick(e, labelsScreen, "labelsBtn", () => renderLabelsList()));

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };
    const handleSearch = debounce((value) => {
        if (labelNotesScreen.style.display === "block") renderLabelNotes(value);
        else if (notesScreen.style.display === "block") renderNotes(value);
        localStorage.setItem("search", value);
    }, 300);
    searchInput.addEventListener("input", (e) => handleSearch(e.target.value));

    // ЗАПУСК
    loadFromStorage();
    loadSettings();
    loadAvatar();
    initTheme();
    setupThemeListeners();
    initFormatting();
    const savedSearch = localStorage.getItem("search") || "";
    searchInput.value = savedSearch;
    renderNotes(savedSearch);
    renderTrash();
    setActiveMenuItem("notesBtn");
});