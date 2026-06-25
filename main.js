/**
 * SoundNotes – Основная логика (серверная версия)
 * Исправлено: удаление/редактирование, работа с id разных типов
 * Добавлено: закрытие боковой панели при клике вне неё и по пунктам меню
 */

const API_BASE = '/api';

// Глобальные переменные
let notes = [];
let trash = [];
let labels = [];
let currentLabelId = null;
let pendingDeleteId = null;
let currentNoteForLabel = null;
let editingNoteId = null;

// DOM элементы
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

const activeIndicator = document.querySelector(".active_indicator");
const menuItems = [notesBtn, labelsBtn, trashBtn, settingsBtn, helpBtn];

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function getToken() {
    return localStorage.getItem("session_token");
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem("session_token");
            localStorage.removeItem("user");
            window.location.href = "auth.html";
            throw new Error("Сессия истекла");
        }
        throw new Error(data.error || "Ошибка запроса");
    }
    return data;
}

function formatDate(timestamp) {
    if (!timestamp) return "Дата неизвестна";
    const d = new Date(timestamp);
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
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

function setActiveMenuItem(activeId) {
    menuItems.forEach(item => item?.classList.remove("active"));
    const activeElement = document.getElementById(activeId);
    if (activeElement) activeElement.classList.add("active");
    if (activeIndicator && activeElement) {
        const offsetTop = activeElement.offsetTop;
        activeIndicator.style.transform = `translateY(${offsetTop}px)`;
    }
}

function showScreen(screen) {
    [notesScreen, trashScreen, settingsScreen, helpScreen, labelsScreen, labelNotesScreen].forEach(s => {
        if (s) s.style.display = "none";
    });
    if (screen) screen.style.display = "block";
}

// ========== ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ==========
async function loadNotes() {
    try {
        const data = await apiRequest("notes.php");
        notes = data.map(n => ({
            ...n,
            id: Number(n.id),
            labels: n.labels || []
        }));
        renderNotes(searchInput.value);
    } catch (err) {
        console.error("Ошибка загрузки заметок:", err);
    }
}

async function loadTrash() {
    try {
        const data = await apiRequest("trash.php");
        trash = data.map(n => ({ ...n, id: Number(n.id) }));
        renderTrash();
    } catch (err) {
        console.error("Ошибка загрузки корзины:", err);
    }
}

async function loadLabels() {
    try {
        const data = await apiRequest("labels.php");
        labels = data.map(l => ({ ...l, id: Number(l.id) }));
        renderLabelsList();
    } catch (err) {
        console.error("Ошибка загрузки ярлыков:", err);
    }
}

// ========== РЕНДЕРИНГ ЗАМЕТОК ==========
function renderNotes(filter = "") {
    if (!notesGrid) return;
    notesGrid.innerHTML = "";
    let filtered = notes;
    if (filter.trim()) {
        filtered = notes.filter(note => {
            const text = ((note.title || "") + " " + (note.content || "")).toLowerCase();
            if (text.includes(filter.toLowerCase())) return true;
            if (filter.startsWith("#")) {
                const tagQuery = filter.slice(1).toLowerCase();
                return note.labels.some(lbl => lbl.name.toLowerCase() === tagQuery);
            }
            return false;
        });
    }
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
        const titleHtml = highlightText(escapeHtml(title), filter);
        const dateStr = formatDate(note.updated_at || note.created_at);
        const dateHtml = `<div class="note-date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>`;

        let labelsHtml = "";
        if (note.labels && note.labels.length) {
            labelsHtml = `<div class="note-labels">${note.labels.map(label => `
                <span class="label-tag-wrapper">
                    <span class="label-tag" data-label-id="${label.id}" data-name="${escapeHtml(label.name)}">${escapeHtml(label.name)}</span>
                    <button class="remove-label-from-note-btn" data-note-id="${note.id}" data-label-id="${label.id}" title="Убрать ярлык"><i class="fas fa-times"></i></button>
                </span>`).join('')}</div>`;
        }

        if (detailsEnabled) {
            el.innerHTML = `
                <h3>${titleHtml}</h3>
                ${dateHtml}
                <div class="note-content note-text expanded">${note.content || '<em>Пустая заметка</em>'}</div>
                ${labelsHtml}
                <div class="note-card-actions">
                    <button class="edit-btn" data-id="${note.id}">Редактировать</button>
                    <button class="delete-btn" data-id="${note.id}">Удалить</button>
                    <button class="add-label-btn" data-id="${note.id}">Ярлык</button>
                </div>
            `;
        } else {
            const plainText = note.content ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) : "";
            el.innerHTML = `
                <h3>${titleHtml}</h3>
                ${dateHtml}
                <p class="note-text truncated">${escapeHtml(plainText)}${plainText.length >= 100 ? '...' : ''}</p>
                ${labelsHtml}
                <div class="note-card-actions">
                    <button class="edit-btn" data-id="${note.id}">Редактировать</button>
                    <button class="delete-btn" data-id="${note.id}">Удалить</button>
                    <button class="add-label-btn" data-id="${note.id}">Ярлык</button>
                </div>
            `;
        }
        notesGrid.appendChild(el);
    });
}

function renderTrash() {
    if (!trashGrid) return;
    trashGrid.innerHTML = "";
    if (trash.length === 0) {
        trashGrid.innerHTML = `<p class="empty-state">Корзина пуста</p>`;
        return;
    }
    const detailsEnabled = isDetailsEnabled();
    trash.forEach(note => {
        const el = document.createElement("div");
        el.classList.add("note-card");
        const text = (note.content || "").replace(/<[^>]*>/g, '');
        const dateStr = formatDate(note.updated_at || note.created_at);
        const textClass = detailsEnabled ? "expanded" : "truncated";
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
            <span class="label-name" data-id="${label.id}" data-name="${escapeHtml(label.name)}">${escapeHtml(label.name)}</span>
            <button class="delete-label-btn" data-id="${label.id}">Удалить</button>
        `;
        container.appendChild(div);
    });
    document.querySelectorAll(".label-name").forEach(el => {
        el.addEventListener("click", () => {
            const name = el.getAttribute("data-name");
            if (name) searchByTag(name);
        });
    });
    document.querySelectorAll(".delete-label-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const id = Number(btn.dataset.id);
            await deleteLabelById(id);
        });
    });
}

// ========== ОПЕРАЦИИ С ЗАМЕТКАМИ ==========
async function createNote(title, content, labelIds = []) {
    const data = await apiRequest("notes.php", {
        method: "POST",
        body: JSON.stringify({ title, content, label_ids: labelIds })
    });
    await loadNotes();
    if (currentLabelId) await renderLabelNotes();
    return data;
}

async function updateNote(id, title, content) {
    await apiRequest(`notes.php?id=${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, content })
    });
    await loadNotes();
    if (currentLabelId) await renderLabelNotes();
}

async function deleteNoteSoft(id) {
    await apiRequest(`notes.php?id=${id}`, { method: "DELETE" });
    await loadNotes();
    await loadTrash();
    if (currentLabelId) await renderLabelNotes();
}

async function restoreNote(id) {
    await apiRequest(`notes.php?id=${id}`, {
        method: "PUT",
        body: JSON.stringify({ restore: true })
    });
    await loadNotes();
    await loadTrash();
    if (currentLabelId) await renderLabelNotes();
}

async function deleteNotePermanent(id) {
    await apiRequest(`notes.php?id=${id}&permanent=true`, { method: "DELETE" });
    await loadTrash();
}

async function addLabelToNote(noteId, labelId) {
    await apiRequest(`notes.php/${noteId}/labels`, {
        method: "POST",
        body: JSON.stringify({ label_id: labelId })
    });
    await loadNotes();
    if (currentLabelId) await renderLabelNotes();
}

async function removeLabelFromNote(noteId, labelId) {
    await apiRequest(`notes.php/${noteId}/labels/${labelId}`, { method: "DELETE" });
    await loadNotes();
    if (currentLabelId) await renderLabelNotes();
}

// ========== ОПЕРАЦИИ С ЯРЛЫКАМИ ==========
async function createLabel(name) {
    const data = await apiRequest("labels.php", {
        method: "POST",
        body: JSON.stringify({ name })
    });
    await loadLabels();
    return data;
}

async function deleteLabelById(labelId) {
    await apiRequest(`labels.php?id=${labelId}`, { method: "DELETE" });
    if (currentLabelId === labelId) {
        currentLabelId = null;
        showScreen(labelsScreen);
    }
    await loadLabels();
    await loadNotes();
    if (currentLabelId) await renderLabelNotes();
}

// ========== АВАТАР ==========
async function loadAvatar() {
    try {
        const data = await apiRequest("avatar.php");
        if (data.avatar) {
            profileAvatar.src = data.avatar;
            profileAvatar.classList.remove("hidden");
            profileLetter.classList.add("hidden");
        } else {
            profileAvatar.classList.add("hidden");
            profileLetter.classList.remove("hidden");
        }
    } catch (e) {
        console.warn("Не удалось загрузить аватар");
    }
}

async function saveAvatar(base64) {
    await apiRequest("avatar.php", {
        method: "POST",
        body: JSON.stringify({ avatar: base64 })
    });
    await loadAvatar();
}

async function deleteAvatar() {
    await apiRequest("avatar.php", { method: "DELETE" });
    await loadAvatar();
}

// ========== НАСТРОЙКИ И ТЕМА ==========
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
    renderNotes(searchInput.value);
    if (trashScreen.style.display !== "none") renderTrash();
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

// ========== ПОИСК ПО ЯРЛЫКУ ==========
function searchByTag(tagName) {
    if (!tagName) return;
    const searchValue = `#${tagName}`;
    searchInput.value = searchValue;
    renderNotes(searchValue);
    showScreen(notesScreen);
    setActiveMenuItem("notesBtn");
    localStorage.setItem("search", searchValue);
}

// ========== РЕДАКТИРОВАНИЕ ЗАМЕТКИ ==========
function openEditorForNote(note) {
    editingNoteId = note.id;
    if (titleInputExpanded) titleInputExpanded.value = note.title || "";
    textInput.innerHTML = note.content || "";
    addBtn.textContent = "Сохранить изменения";
    addBtn.style.backgroundColor = "#ffffff";
    collapsed.style.display = "none";
    expanded.style.display = "flex";
    if (titleInputExpanded) titleInputExpanded.focus();
}

function cancelEditing() {
    editingNoteId = null;
    addBtn.textContent = "Добавить";
    addBtn.style.backgroundColor = "";
    clearInputs();
}

function clearInputs() {
    if (titleInputExpanded) titleInputExpanded.value = "";
    if (titleInputCollapsed) titleInputCollapsed.value = "";
    if (textInput) textInput.innerHTML = "";
    if (titleInputExpandedLabel) titleInputExpandedLabel.value = "";
    if (titleInputLabelCollapsed) titleInputLabelCollapsed.value = "";
    if (textInputLabel) textInputLabel.innerHTML = "";
}

// ========== ФОРМАТИРОВАНИЕ ТЕКСТА ==========
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
        if (node && node !== editor) node.style.textAlign = align;
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

function initFormatting() {
    if (formatStyleSelect && textInput) {
        formatStyleSelect.addEventListener("change", (e) => applyHeading(formatStyleSelect, textInput));
        textInput.addEventListener("click", () => updateStyleSelect(textInput, formatStyleSelect));
        textInput.addEventListener("keyup", () => updateStyleSelect(textInput, formatStyleSelect));
    }
    const toolbar = document.querySelector("#expandedNote .formatting-toolbar");
    if (toolbar) {
        toolbar.querySelectorAll("button[data-command]").forEach(btn => {
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
        formatStyleLabel.addEventListener("change", (e) => applyHeading(formatStyleLabel, textInputLabel));
        textInputLabel.addEventListener("click", () => updateStyleSelect(textInputLabel, formatStyleLabel));
        textInputLabel.addEventListener("keyup", () => updateStyleSelect(textInputLabel, formatStyleLabel));
    }
    const toolbarLabel = document.querySelector("#expandedNoteLabel .formatting-toolbar");
    if (toolbarLabel) {
        toolbarLabel.querySelectorAll("button[data-command]").forEach(btn => {
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
}

// ========== СОБЫТИЯ ИНТЕРФЕЙСА ==========
async function handleAddNote() {
    let title = titleInputExpanded ? titleInputExpanded.value.trim() : titleInputCollapsed.value.trim();
    const content = textInput.innerHTML;
    if (!title && (!content || content === "<br>" || content === "")) {
        alert("Заголовок или текст не могут быть пустыми");
        return;
    }
    if (editingNoteId) {
        await updateNote(editingNoteId, title, content);
        cancelEditing();
    } else {
        await createNote(title, content);
    }
    clearInputs();
    expanded.style.display = "none";
    collapsed.style.display = "block";
}

async function handleAddNoteLabel() {
    let title = titleInputExpandedLabel ? titleInputExpandedLabel.value.trim() : titleInputLabelCollapsed.value.trim();
    const content = textInputLabel.innerHTML;
    if (!title && (!content || content === "<br>" || content === "")) return;
    const labelIds = currentLabelId ? [currentLabelId] : [];
    await createNote(title, content, labelIds);
    clearInputs();
    expandedLabel.style.display = "none";
    collapsedLabel.style.display = "block";
    if (currentLabelId) await renderLabelNotes();
}

async function renderLabelNotes(filter = "") {
    if (!labelNotesGrid) return;
    labelNotesGrid.innerHTML = "";
    if (!currentLabelId) return;
    const label = labels.find(l => l.id === currentLabelId);
    if (!label) {
        labelNotesGrid.innerHTML = `<p class="empty-state">Ярлык не найден</p>`;
        return;
    }
    let filteredNotes = notes.filter(note => note.labels.some(lbl => lbl.id === currentLabelId));
    if (filter) {
        filteredNotes = filteredNotes.filter(note => {
            const text = ((note.title || "") + " " + (note.content || "")).toLowerCase();
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
        const titleHtml = highlightText(escapeHtml(note.title || "Без названия"), filter);
        const dateStr = formatDate(note.updated_at || note.created_at);
        const dateHtml = `<div class="note-date"><i class="far fa-calendar-alt"></i> ${dateStr}</div>`;
        if (detailsEnabled) {
            el.innerHTML = `
                <h3>${titleHtml}</h3>
                ${dateHtml}
                <div class="note-content note-text expanded">${note.content || '<em>Пустая заметка</em>'}</div>
                <div class="note-card-actions-vertical">
                    <button class="remove-label-btn" data-id="${note.id}">Убрать ярлык</button>
                </div>
            `;
        } else {
            const plainText = note.content ? note.content.replace(/<[^>]*>/g, '').substring(0, 100) : "";
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

// ========== ОСНОВНЫЕ ОБРАБОТЧИКИ ==========
notesGrid.addEventListener("click", async (e) => {
    const removeLabelBtn = e.target.closest(".remove-label-from-note-btn");
    if (removeLabelBtn) {
        e.stopPropagation();
        const noteId = Number(removeLabelBtn.dataset.noteId);
        const labelId = Number(removeLabelBtn.dataset.labelId);
        await removeLabelFromNote(noteId, labelId);
        return;
    }

    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
        const id = Number(editBtn.dataset.id);
        const note = notes.find(n => n.id === id);
        if (note) {
            openEditorForNote(note);
        } else {
            console.error("Заметка для редактирования не найдена, id=", id);
            alert("Ошибка: заметка не найдена. Обновите страницу.");
        }
        return;
    }

    const deleteBtn = e.target.closest(".delete-btn");
    if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const note = notes.find(n => n.id === id);
        if (!note) {
            console.error("Заметка для удаления не найдена, id=", id);
            alert("Ошибка: заметка не найдена. Обновите страницу.");
            return;
        }
        if (isConfirmDeleteEnabled()) {
            const preview = note.title || (note.content || "").replace(/<[^>]*>/g, '').substring(0, 50) || "Без названия";
            modalNoteText.textContent = `Вы уверены, что хотите удалить заметку "${preview}${preview.length >= 50 ? '...' : ''}"?`;
            pendingDeleteId = id;
            confirmModal.style.display = "flex";
            confirmModal.classList.remove("hidden");
        } else {
            await deleteNoteSoft(id);
        }
        return;
    }

    const addLabelBtn = e.target.closest(".add-label-btn");
    if (addLabelBtn) {
        const id = Number(addLabelBtn.dataset.id);
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

    const labelTag = e.target.closest(".label-tag");
    if (labelTag) {
        const labelName = labelTag.getAttribute("data-name");
        if (labelName) searchByTag(labelName);
    }
});

labelNotesGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".remove-label-btn");
    if (btn) {
        const id = Number(btn.dataset.id);
        if (currentLabelId) {
            await removeLabelFromNote(id, currentLabelId);
            await renderLabelNotes(searchInput.value);
        }
    }
});

trashGrid.addEventListener("click", async (e) => {
    const id = Number(e.target.dataset.id);
    if (isNaN(id)) return;
    if (e.target.classList.contains("restore-btn")) {
        await restoreNote(id);
    }
    if (e.target.classList.contains("delete-forever-btn")) {
        await deleteNotePermanent(id);
    }
});

modalCancel.addEventListener("click", () => {
    confirmModal.style.display = "none";
    confirmModal.classList.add("hidden");
    pendingDeleteId = null;
});
modalConfirm.addEventListener("click", async () => {
    if (pendingDeleteId !== null) {
        await deleteNoteSoft(pendingDeleteId);
        pendingDeleteId = null;
    }
    confirmModal.style.display = "none";
    confirmModal.classList.add("hidden");
});
modalAddLabelCancel.addEventListener("click", () => {
    addLabelModal.style.display = "none";
    addLabelModal.classList.add("hidden");
    currentNoteForLabel = null;
});
modalAddLabelConfirm.addEventListener("click", async () => {
    const selectedLabelId = parseInt(modalLabelSelect.value);
    if (selectedLabelId && currentNoteForLabel !== null) {
        await addLabelToNote(currentNoteForLabel, selectedLabelId);
    }
    addLabelModal.style.display = "none";
    addLabelModal.classList.add("hidden");
    currentNoteForLabel = null;
});

createLabelBtn.addEventListener("click", async () => {
    let name = newLabelInput.value.trim();
    if (!name) {
        alert("Название ярлыка не может быть пустым");
        return;
    }
    if (name.length > 30) name = name.slice(0, 30);
    if (labels.some(l => l.name.toLowerCase() === name.toLowerCase())) {
        alert("Такой ярлык уже существует");
        return;
    }
    await createLabel(name);
    newLabelInput.value = "";
});

backToLabelsBtn.addEventListener("click", () => {
    currentLabelId = null;
    showScreen(labelsScreen);
    renderLabelsList();
    setActiveMenuItem("labelsBtn");
});
deleteCurrentLabelBtn.addEventListener("click", async () => {
    if (currentLabelId && confirm("Удалить этот ярлык? Он исчезнет из всех заметок.")) {
        await deleteLabelById(currentLabelId);
        currentLabelId = null;
        showScreen(labelsScreen);
        renderLabelsList();
        setActiveMenuItem("labelsBtn");
    }
});

// ========== НАВИГАЦИЯ ==========
trashBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(trashScreen);
    setActiveMenuItem("trashBtn");
    renderTrash();
    sidebar.classList.add('closed');  // закрываем панель
});

notesBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(notesScreen);
    setActiveMenuItem("notesBtn");
    renderNotes(searchInput.value);
    sidebar.classList.add('closed');
});

settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(settingsScreen);
    setActiveMenuItem("settingsBtn");
    sidebar.classList.add('closed');
});

helpBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(helpScreen);
    setActiveMenuItem("helpBtn");
    sidebar.classList.add('closed');
});

labelsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    showScreen(labelsScreen);
    setActiveMenuItem("labelsBtn");
    renderLabelsList();
    sidebar.classList.add('closed');
});

collapsed.addEventListener("click", () => {
    cancelEditing();
    collapsed.style.display = "none";
    expanded.style.display = "flex";
    if (titleInputExpanded) titleInputExpanded.focus();
});
closeBtn.addEventListener("click", () => {
    expanded.style.display = "none";
    collapsed.style.display = "block";
    cancelEditing();
    clearInputs();
});
addBtn.addEventListener("click", handleAddNote);

collapsedLabel.addEventListener("click", () => {
    collapsedLabel.style.display = "none";
    expandedLabel.style.display = "flex";
    if (titleInputExpandedLabel) titleInputExpandedLabel.focus();
});
closeBtnLabel.addEventListener("click", () => {
    expandedLabel.style.display = "none";
    collapsedLabel.style.display = "block";
    clearInputs();
});
addBtnLabel.addEventListener("click", handleAddNoteLabel);

detailsToggle?.addEventListener("change", () => {
    saveSettings();
    renderNotes(searchInput.value);
    if (trashScreen.style.display !== "none") renderTrash();
});
confirmDeleteToggle?.addEventListener("change", saveSettings);

burger.addEventListener("click", () => sidebar.classList.toggle("closed"));

// ========== ЗАКРЫТИЕ БОКОВОЙ ПАНЕЛИ ПРИ КЛИКЕ ВНЕ НЕЁ ==========
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const burger = document.getElementById('burger');
    if (!sidebar.contains(event.target) && !burger.contains(event.target)) {
        if (!sidebar.classList.contains('closed')) {
            sidebar.classList.add('closed');
        }
    }
});

document.querySelectorAll("#logoutBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
        try {
            await apiRequest("logout.php", { method: "POST" });
        } catch(e) {}
        localStorage.removeItem("session_token");
        localStorage.removeItem("user");
        window.location.href = "auth.html";
    });
});

// Профиль
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
    reader.onload = async (event) => {
        const imageData = event.target.result;
        const img = new Image();
        img.onload = async () => {
            let finalData = imageData;
            if (img.width > 300 || img.height > 300) {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const ratio = Math.min(300 / img.width, 300 / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                finalData = canvas.toDataURL("image/jpeg", 0.8);
            }
            await saveAvatar(finalData);
            profileDropdown.classList.add("hidden");
        };
        img.src = imageData;
    };
    reader.readAsDataURL(file);
});
removeAvatarBtn.addEventListener("click", async () => {
    await deleteAvatar();
    profileDropdown.classList.add("hidden");
});

// Поиск с debounce
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

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    if (!getToken()) {
        window.location.href = "auth.html";
        return;
    }
    try {
        await Promise.all([loadNotes(), loadTrash(), loadLabels(), loadAvatar()]);
    } catch (err) {
        console.error(err);
    }
    loadSettings();
    initTheme();
    setupThemeListeners();
    initFormatting();
    const savedSearch = localStorage.getItem("search") || "";
    searchInput.value = savedSearch;
    renderNotes(savedSearch);
    setActiveMenuItem("notesBtn");
    showScreen(notesScreen);
}

init();