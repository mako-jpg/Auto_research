const STATUS_LABELS = {
  pending: "未着手",
  researching: "リサーチ中",
  drafted: "下書き完了",
  active: "定期実行中",
  done: "完了",
  archived: "アーカイブ",
};

const OUTPUT_LABELS = { article: "記事下書き", video: "動画構成" };
const OUTPUT_TYPE_KEYS = ["article", "video"];
const DEFAULT_OUTPUT_TYPES = ["article", "video"];
const DEFAULT_PRIORITY = 3;
const FILTER_STATUSES = ["pending", "researching", "active", "done"];
const EDITABLE_STATUSES = ["pending", "done", "archived"];

const RESEARCH_MODE_LABELS = { once: "単発", recurring: "定期的" };
const RESEARCH_MODE_KEYS = ["once", "recurring"];
const RECURRING_FREQUENCY_LABELS = { daily: "毎日", weekly: "毎週", monthly: "毎月" };
const RECURRING_FREQUENCY_KEYS = ["daily", "weekly", "monthly"];
const DEFAULT_RESEARCH_MODE = "once";
const DEFAULT_RECURRING_FREQUENCY = "weekly";

const STATUS_TAG_COLORS = {
  pending: "gray",
  researching: "yellow",
  drafted: "blue",
  active: "purple",
  done: "green",
  archived: "brown",
};
const PRIORITY_TAG_COLORS = { 1: "gray", 2: "gray", 3: "blue", 4: "orange", 5: "red" };
const CATEGORY_TAG_COLORS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];

function categoryTagColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_TAG_COLORS[Math.abs(hash) % CATEGORY_TAG_COLORS.length];
}

const memoList = document.getElementById("memo-list");
const emptyState = document.getElementById("empty-state");
const form = document.getElementById("memo-form");
const formError = document.getElementById("form-error");
const statusFilters = document.getElementById("status-filters");
const logoutBtn = document.getElementById("logout-btn");
const priorityPicker = document.getElementById("priority-picker");
const categoryPicker = document.getElementById("category-picker");
const outputTypePicker = document.getElementById("output-type-picker");
const researchModePicker = document.getElementById("research-mode-picker");
const recurringFrequencyBlock = document.getElementById("recurring-frequency-block");
const recurringFrequencyPicker = document.getElementById("recurring-frequency-picker");
const sourceUrlInput = document.getElementById("source-url");
const screenshotInput = document.getElementById("screenshot-input");
const screenshotPreview = document.getElementById("screenshot-preview");
const screenshotClearBtn = document.getElementById("screenshot-clear-btn");
const addCategoryBtn = document.getElementById("add-category-btn");
const addMemoFab = document.getElementById("add-memo-fab");
const addMemoModal = document.getElementById("add-memo-modal");
const addMemoClose = document.getElementById("add-memo-close");
const pageTabs = document.getElementById("page-tabs");
const researchGrid = document.getElementById("research-grid");
const researchEmpty = document.getElementById("research-empty");

const outputBackBtn = document.getElementById("output-back-btn");
const outputPageTitle = document.getElementById("output-page-title");
const outputTabs = document.getElementById("output-tabs");
const outputHistory = document.getElementById("output-history");
const outputPageContent = document.getElementById("output-page-content");

const memoModal = document.getElementById("memo-modal");
const memoModalTitle = document.getElementById("memo-modal-title");
const memoModalClose = document.getElementById("memo-modal-close");
const memoView = document.getElementById("memo-view");
const memoViewBadges = document.getElementById("memo-view-badges");
const memoViewBrief = document.getElementById("memo-view-brief");
const memoViewSourceUrl = document.getElementById("memo-view-source-url");
const memoViewScreenshot = document.getElementById("memo-view-screenshot");
const memoViewOutputs = document.getElementById("memo-view-outputs");
const memoViewStatus = document.getElementById("memo-view-status");
const memoEditBtn = document.getElementById("memo-edit-btn");
const memoDeleteBtn = document.getElementById("memo-delete-btn");
const memoEditForm = document.getElementById("memo-edit-form");
const memoEditCancel = document.getElementById("memo-edit-cancel");
const editTitle = document.getElementById("edit-title");
const editBrief = document.getElementById("edit-brief");
const editPriorityPicker = document.getElementById("edit-priority-picker");
const editCategoryPicker = document.getElementById("edit-category-picker");
const editSourceUrlInput = document.getElementById("edit-source-url");
const editScreenshotInput = document.getElementById("edit-screenshot-input");
const editScreenshotPreview = document.getElementById("edit-screenshot-preview");
const editScreenshotClearBtn = document.getElementById("edit-screenshot-clear-btn");
const editOutputTypePicker = document.getElementById("edit-output-type-picker");
const editResearchModePicker = document.getElementById("edit-research-mode-picker");
const editRecurringFrequencyBlock = document.getElementById("edit-recurring-frequency-block");
const editRecurringFrequencyPicker = document.getElementById("edit-recurring-frequency-picker");
const editError = document.getElementById("edit-error");

let memos = [];
let categories = [];
let activeFilter = "all";
let formPriority = DEFAULT_PRIORITY;
let formCategories = new Set();
let formOutputTypes = new Set(DEFAULT_OUTPUT_TYPES);
let formResearchMode = DEFAULT_RESEARCH_MODE;
let formRecurringFrequency = DEFAULT_RECURRING_FREQUENCY;
let formScreenshotFile = null;

let currentMemoId = null;
let editPriorityValue = DEFAULT_PRIORITY;
let editCategoriesValue = new Set();
let editOutputTypesValue = new Set(DEFAULT_OUTPUT_TYPES);
let editResearchModeValue = DEFAULT_RESEARCH_MODE;
let editRecurringFrequencyValue = DEFAULT_RECURRING_FREQUENCY;
let editScreenshotFile = null;
let editScreenshotRemove = false;

let currentOutputMemo = null;
let currentOutputType = null;
let currentOutputDate = null;

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, credentials: "same-origin" });
  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("unauthorized");
  }
  return res;
}

function availableOutputTypes(memo) {
  return OUTPUT_TYPE_KEYS.filter((key) => (memo.outputs || {})[key]);
}

function showPage(name) {
  for (const page of ["memo", "research", "output"]) {
    document.getElementById(`page-${page}`).hidden = page !== name;
  }
  pageTabs.hidden = name === "output";
  if (name !== "output") {
    for (const tab of pageTabs.querySelectorAll(".bottom-nav-btn")) {
      tab.classList.toggle("active", tab.dataset.page === name);
    }
  }
}

function renderOutputTabs() {
  const types = availableOutputTypes(currentOutputMemo);
  outputTabs.innerHTML = "";
  for (const key of types) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "output-tab-btn" + (key === currentOutputType ? " active" : "");
    btn.textContent = OUTPUT_LABELS[key] || key;
    btn.addEventListener("click", () => {
      currentOutputType = key;
      currentOutputDate = null;
      renderOutputTabs();
      renderOutputHistory();
      loadOutputContent();
    });
    outputTabs.appendChild(btn);
  }
}

function renderOutputHistory() {
  const memo = currentOutputMemo;
  const dates = (memo.history || [])
    .filter((entry) => entry.outputs && entry.outputs[currentOutputType])
    .map((entry) => entry.date)
    .sort()
    .reverse();

  outputHistory.innerHTML = "";
  if (memo.researchMode !== "recurring" || dates.length === 0) {
    outputHistory.hidden = true;
    return;
  }
  outputHistory.hidden = false;

  const chips = [["最新", null], ...dates.map((date) => [date, date])];
  for (const [label, date] of chips) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "output-history-chip" + (currentOutputDate === date ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      currentOutputDate = date;
      renderOutputHistory();
      loadOutputContent();
    });
    outputHistory.appendChild(btn);
  }
}

function renderMarkdown(container, text) {
  const html = window.DOMPurify.sanitize(window.marked.parse(text, { gfm: true, breaks: true }));
  container.innerHTML = html;
  for (const a of container.querySelectorAll("a")) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
}

async function loadOutputContent() {
  outputPageContent.textContent = "読み込み中…";
  try {
    const query = currentOutputDate ? `?date=${encodeURIComponent(currentOutputDate)}` : "";
    const res = await api(`/api/memos/${currentOutputMemo.id}/outputs/${currentOutputType}${query}`);
    if (!res.ok) {
      outputPageContent.textContent = "まだ生成されていません。";
      return;
    }
    renderMarkdown(outputPageContent, await res.text());
  } catch {
    outputPageContent.textContent = "読み込みに失敗しました。";
  }
}

function openOutputPage(memo, type) {
  const types = availableOutputTypes(memo);
  if (types.length === 0) return;

  currentOutputMemo = memo;
  currentOutputType = types.includes(type) ? type : types[0];
  currentOutputDate = null;
  outputPageTitle.textContent = memo.title;
  renderOutputTabs();
  renderOutputHistory();
  showPage("output");
  loadOutputContent();
}

outputBackBtn.addEventListener("click", () => {
  showPage("research");
});

async function fetchMemos() {
  const res = await api("/api/memos");
  memos = await res.json();
  renderFilters();
  render();
  renderResearchGrid();
}

pageTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".bottom-nav-btn");
  if (!btn) return;
  showPage(btn.dataset.page);
});

function renderResearchGrid() {
  const withOutputs = memos.filter((m) => availableOutputTypes(m).length > 0);
  researchGrid.innerHTML = "";
  researchEmpty.hidden = withOutputs.length > 0;

  for (const memo of withOutputs) {
    researchGrid.appendChild(renderResearchCard(memo));
  }
}

function renderResearchCard(memo) {
  const card = document.createElement("article");
  card.className = "research-card";
  card.setAttribute("role", "button");
  card.tabIndex = 0;
  const open = () => openOutputPage(memo);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });

  const title = document.createElement("h3");
  title.className = "research-card-title";
  title.textContent = memo.title;
  card.appendChild(title);

  const excerpt = document.createElement("p");
  excerpt.className = "research-card-excerpt";
  excerpt.textContent = memo.brief;
  card.appendChild(excerpt);

  const meta = document.createElement("div");
  meta.className = "memo-meta";
  const statusBadge = document.createElement("span");
  statusBadge.className = `badge tag-${STATUS_TAG_COLORS[memo.status] || "gray"}`;
  statusBadge.textContent = STATUS_LABELS[memo.status] || memo.status;
  meta.appendChild(statusBadge);
  if (memo.researchMode === "recurring") {
    const modeBadge = document.createElement("span");
    modeBadge.className = "badge tag-purple";
    modeBadge.textContent = `定期・${RECURRING_FREQUENCY_LABELS[memo.recurringFrequency] || ""}`;
    meta.appendChild(modeBadge);
  }
  for (const category of memo.categories || []) {
    const categoryEl = document.createElement("span");
    categoryEl.className = `tag tag-${categoryTagColor(category)}`;
    categoryEl.textContent = category;
    meta.appendChild(categoryEl);
  }
  card.appendChild(meta);

  if (memo.researchMode === "recurring" && (memo.history || []).length > 0) {
    const historyNote = document.createElement("p");
    historyNote.className = "research-card-history-count";
    historyNote.textContent = `履歴 ${memo.history.length}件`;
    card.appendChild(historyNote);
  }

  return card;
}

async function fetchCategories() {
  const res = await api("/api/categories");
  categories = await res.json();
  renderCategoryPicker();
}

function renderPriorityDots(container, selectedLevel, onSelect) {
  container.innerHTML = "";
  for (let level = 1; level <= 5; level++) {
    const isActive = level === selectedLevel;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "priority-dot" + (isActive ? " active" : "");
    btn.setAttribute("aria-label", `優先度 ${level}`);
    if (isActive) btn.textContent = String(level);
    btn.addEventListener("click", () => onSelect(level));
    container.appendChild(btn);
  }
}

function renderCategoryChips(container, selectedSet, onToggle) {
  container.innerHTML = "";
  for (const name of categories) {
    const isActive = selectedSet.has(name);
    const color = categoryTagColor(name);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn" + (isActive ? " active" : "");

    const dot = document.createElement("span");
    dot.className = "category-dot";
    dot.style.background = `var(--tag-${color}-fg)`;
    btn.appendChild(dot);
    btn.appendChild(document.createTextNode(name));

    btn.addEventListener("click", () => onToggle(name));
    container.appendChild(btn);
  }
}

function renderPriorityPicker() {
  renderPriorityDots(priorityPicker, formPriority, (level) => {
    formPriority = level;
    renderPriorityPicker();
  });
}

function renderCategoryPicker() {
  renderCategoryChips(categoryPicker, formCategories, (name) => {
    if (formCategories.has(name)) formCategories.delete(name);
    else formCategories.add(name);
    renderCategoryPicker();
  });
}

function renderEditPriorityPicker() {
  renderPriorityDots(editPriorityPicker, editPriorityValue, (level) => {
    editPriorityValue = level;
    renderEditPriorityPicker();
  });
}

function renderEditCategoryPicker() {
  renderCategoryChips(editCategoryPicker, editCategoriesValue, (name) => {
    if (editCategoriesValue.has(name)) editCategoriesValue.delete(name);
    else editCategoriesValue.add(name);
    renderEditCategoryPicker();
  });
}

function renderOutputTypeChips(container, selectedSet, onToggle) {
  container.innerHTML = "";
  for (const key of OUTPUT_TYPE_KEYS) {
    const isActive = selectedSet.has(key);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn" + (isActive ? " active" : "");
    btn.textContent = OUTPUT_LABELS[key];
    btn.addEventListener("click", () => onToggle(key));
    container.appendChild(btn);
  }
}

function renderOutputTypePicker() {
  renderOutputTypeChips(outputTypePicker, formOutputTypes, (key) => {
    if (formOutputTypes.has(key) && formOutputTypes.size > 1) formOutputTypes.delete(key);
    else formOutputTypes.add(key);
    renderOutputTypePicker();
  });
}

function renderEditOutputTypePicker() {
  renderOutputTypeChips(editOutputTypePicker, editOutputTypesValue, (key) => {
    if (editOutputTypesValue.has(key) && editOutputTypesValue.size > 1) editOutputTypesValue.delete(key);
    else editOutputTypesValue.add(key);
    renderEditOutputTypePicker();
  });
}

function renderSingleSelectChips(container, options, selectedValue, onSelect) {
  container.innerHTML = "";
  for (const [key, label] of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-btn" + (key === selectedValue ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => onSelect(key));
    container.appendChild(btn);
  }
}

const RESEARCH_MODE_OPTIONS = RESEARCH_MODE_KEYS.map((k) => [k, RESEARCH_MODE_LABELS[k]]);
const RECURRING_FREQUENCY_OPTIONS = RECURRING_FREQUENCY_KEYS.map((k) => [k, RECURRING_FREQUENCY_LABELS[k]]);

function renderResearchModePicker() {
  renderSingleSelectChips(researchModePicker, RESEARCH_MODE_OPTIONS, formResearchMode, (key) => {
    formResearchMode = key;
    renderResearchModePicker();
    recurringFrequencyBlock.hidden = formResearchMode !== "recurring";
  });
}

function renderRecurringFrequencyPicker() {
  renderSingleSelectChips(recurringFrequencyPicker, RECURRING_FREQUENCY_OPTIONS, formRecurringFrequency, (key) => {
    formRecurringFrequency = key;
    renderRecurringFrequencyPicker();
  });
}

function renderEditResearchModePicker() {
  renderSingleSelectChips(editResearchModePicker, RESEARCH_MODE_OPTIONS, editResearchModeValue, (key) => {
    editResearchModeValue = key;
    renderEditResearchModePicker();
    editRecurringFrequencyBlock.hidden = editResearchModeValue !== "recurring";
  });
}

function renderEditRecurringFrequencyPicker() {
  renderSingleSelectChips(editRecurringFrequencyPicker, RECURRING_FREQUENCY_OPTIONS, editRecurringFrequencyValue, (key) => {
    editRecurringFrequencyValue = key;
    renderEditRecurringFrequencyPicker();
  });
}

function resetScreenshotField(fileInput, previewEl, clearBtn) {
  fileInput.value = "";
  previewEl.src = "";
  previewEl.hidden = true;
  clearBtn.hidden = true;
}

async function uploadScreenshot(memoId, file) {
  await api(`/api/memos/${memoId}/screenshot`, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
}

screenshotInput.addEventListener("change", () => {
  const file = screenshotInput.files[0];
  if (!file) return;
  formScreenshotFile = file;
  screenshotPreview.src = URL.createObjectURL(file);
  screenshotPreview.hidden = false;
  screenshotClearBtn.hidden = false;
});

screenshotClearBtn.addEventListener("click", () => {
  formScreenshotFile = null;
  resetScreenshotField(screenshotInput, screenshotPreview, screenshotClearBtn);
});

editScreenshotInput.addEventListener("change", () => {
  const file = editScreenshotInput.files[0];
  if (!file) return;
  editScreenshotFile = file;
  editScreenshotRemove = false;
  editScreenshotPreview.src = URL.createObjectURL(file);
  editScreenshotPreview.hidden = false;
  editScreenshotClearBtn.hidden = false;
});

editScreenshotClearBtn.addEventListener("click", () => {
  editScreenshotFile = null;
  editScreenshotRemove = true;
  resetScreenshotField(editScreenshotInput, editScreenshotPreview, editScreenshotClearBtn);
});

addCategoryBtn.addEventListener("click", async () => {
  const name = (window.prompt("新しいカテゴリ名を入力してください") || "").trim();
  if (!name) return;

  const res = await api("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (res.ok) {
    categories = await res.json();
    formCategories.add(name);
    renderCategoryPicker();
  }
});

function renderFilters() {
  const counts = { all: memos.length };
  for (const m of memos) counts[m.status] = (counts[m.status] || 0) + 1;

  const options = [["all", "すべて"], ...FILTER_STATUSES.map((s) => [s, STATUS_LABELS[s]])];
  statusFilters.innerHTML = "";
  for (const [key, label] of options) {
    const count = counts[key] || 0;
    const btn = document.createElement("button");
    btn.className = "filter-btn" + (activeFilter === key ? " active" : "");
    btn.textContent = `${label} (${count})`;
    btn.addEventListener("click", () => {
      activeFilter = key;
      renderFilters();
      render();
    });
    statusFilters.appendChild(btn);
  }
}

function render() {
  const visible = activeFilter === "all" ? memos : memos.filter((m) => m.status === activeFilter);
  memoList.innerHTML = "";
  emptyState.hidden = visible.length > 0;

  for (const memo of visible) {
    memoList.appendChild(renderMemoItem(memo));
  }
}

function renderMemoItem(memo) {
  const li = document.createElement("li");
  li.className = "memo-item";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "memo-title-btn";
  btn.textContent = memo.title;
  btn.addEventListener("click", () => openMemoDetail(memo.id));

  li.appendChild(btn);
  return li;
}

function findMemo(id) {
  return memos.find((m) => m.id === id);
}

function openMemoDetail(id) {
  currentMemoId = id;
  showMemoView();
  memoModal.hidden = false;
}

function showMemoView() {
  const memo = findMemo(currentMemoId);
  if (!memo) {
    memoModal.hidden = true;
    return;
  }

  memoEditForm.hidden = true;
  memoView.hidden = false;
  memoModalTitle.textContent = memo.title;

  memoViewBadges.innerHTML = "";
  const statusBadge = document.createElement("span");
  statusBadge.className = `badge tag-${STATUS_TAG_COLORS[memo.status] || "gray"}`;
  statusBadge.textContent = STATUS_LABELS[memo.status] || memo.status;
  memoViewBadges.appendChild(statusBadge);

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge tag-${PRIORITY_TAG_COLORS[memo.priority] || "gray"}`;
  priorityBadge.textContent = `優先度 ${memo.priority}`;
  memoViewBadges.appendChild(priorityBadge);

  const modeBadge = document.createElement("span");
  modeBadge.className = "badge tag-purple";
  modeBadge.textContent =
    memo.researchMode === "recurring"
      ? `定期・${RECURRING_FREQUENCY_LABELS[memo.recurringFrequency] || ""}`
      : "単発";
  memoViewBadges.appendChild(modeBadge);

  for (const category of memo.categories || []) {
    const categoryEl = document.createElement("span");
    categoryEl.className = `tag tag-${categoryTagColor(category)}`;
    categoryEl.textContent = category;
    memoViewBadges.appendChild(categoryEl);
  }

  memoViewBrief.textContent = memo.brief;

  if (memo.sourceUrl) {
    memoViewSourceUrl.href = memo.sourceUrl;
    memoViewSourceUrl.textContent = `参照URL: ${memo.sourceUrl}`;
    memoViewSourceUrl.hidden = false;
  } else {
    memoViewSourceUrl.hidden = true;
  }

  if (memo.screenshot) {
    memoViewScreenshot.src = `/api/memos/${memo.id}/screenshot`;
    memoViewScreenshot.hidden = false;
  } else {
    memoViewScreenshot.hidden = true;
  }

  memoViewOutputs.innerHTML = "";
  for (const key of availableOutputTypes(memo)) {
    const outputBtn = document.createElement("button");
    outputBtn.className = "output-btn";
    outputBtn.textContent = OUTPUT_LABELS[key] || key;
    outputBtn.addEventListener("click", () => {
      memoModal.hidden = true;
      openOutputPage(memo, key);
    });
    memoViewOutputs.appendChild(outputBtn);
  }

  memoViewStatus.innerHTML = "";
  const statusOptions = EDITABLE_STATUSES.includes(memo.status)
    ? EDITABLE_STATUSES
    : [memo.status, ...EDITABLE_STATUSES];
  for (const value of statusOptions) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = STATUS_LABELS[value] || value;
    if (value === memo.status) opt.selected = true;
    memoViewStatus.appendChild(opt);
  }
}

memoViewStatus.addEventListener("change", () => {
  if (currentMemoId) updateMemo(currentMemoId, { status: memoViewStatus.value });
});

memoEditBtn.addEventListener("click", () => {
  const memo = findMemo(currentMemoId);
  if (!memo) return;

  editTitle.value = memo.title;
  editBrief.value = memo.brief;
  editSourceUrlInput.value = memo.sourceUrl || "";
  editPriorityValue = memo.priority;
  editCategoriesValue = new Set(memo.categories || []);
  editOutputTypesValue = new Set(memo.outputTypes || DEFAULT_OUTPUT_TYPES);
  editResearchModeValue = memo.researchMode || DEFAULT_RESEARCH_MODE;
  editRecurringFrequencyValue = memo.recurringFrequency || DEFAULT_RECURRING_FREQUENCY;
  renderEditPriorityPicker();
  renderEditCategoryPicker();
  renderEditOutputTypePicker();
  renderEditResearchModePicker();
  renderEditRecurringFrequencyPicker();
  editRecurringFrequencyBlock.hidden = editResearchModeValue !== "recurring";

  editScreenshotFile = null;
  editScreenshotRemove = false;
  resetScreenshotField(editScreenshotInput, editScreenshotPreview, editScreenshotClearBtn);
  if (memo.screenshot) {
    editScreenshotPreview.src = `/api/memos/${memo.id}/screenshot`;
    editScreenshotPreview.hidden = false;
    editScreenshotClearBtn.hidden = false;
  }

  editError.hidden = true;

  memoView.hidden = true;
  memoEditForm.hidden = false;
});

memoEditCancel.addEventListener("click", showMemoView);

memoEditForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  editError.hidden = true;

  const payload = {
    title: editTitle.value,
    brief: editBrief.value,
    sourceUrl: editSourceUrlInput.value,
    priority: editPriorityValue,
    categories: [...editCategoriesValue],
    outputTypes: [...editOutputTypesValue],
    researchMode: editResearchModeValue,
    recurringFrequency: editRecurringFrequencyValue,
  };

  const res = await api(`/api/memos/${currentMemoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    editError.textContent = data.error || "保存に失敗しました。";
    editError.hidden = false;
    return;
  }

  if (editScreenshotFile) {
    await uploadScreenshot(currentMemoId, editScreenshotFile);
  } else if (editScreenshotRemove) {
    await api(`/api/memos/${currentMemoId}/screenshot`, { method: "DELETE" });
  }

  await fetchMemos();
  showMemoView();
});

memoDeleteBtn.addEventListener("click", () => {
  if (currentMemoId) deleteMemo(currentMemoId);
});

memoModalClose.addEventListener("click", () => {
  memoModal.hidden = true;
});
memoModal.addEventListener("click", (e) => {
  if (e.target === memoModal) memoModal.hidden = true;
});

async function updateMemo(id, patch) {
  await api(`/api/memos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await fetchMemos();
  if (currentMemoId === id && !memoModal.hidden) showMemoView();
}

async function deleteMemo(id) {
  if (!confirm("このメモを削除しますか？")) return;
  await api(`/api/memos/${id}`, { method: "DELETE" });
  memoModal.hidden = true;
  await fetchMemos();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const payload = {
    title: document.getElementById("title").value,
    brief: document.getElementById("brief").value,
    sourceUrl: sourceUrlInput.value,
    willAttachScreenshot: Boolean(formScreenshotFile),
    priority: formPriority,
    categories: [...formCategories],
    outputTypes: [...formOutputTypes],
    researchMode: formResearchMode,
    recurringFrequency: formRecurringFrequency,
  };

  const res = await api("/api/memos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    formError.textContent = data.error || "メモの追加に失敗しました。";
    formError.hidden = false;
    return;
  }

  const memo = await res.json();
  if (formScreenshotFile) {
    await uploadScreenshot(memo.id, formScreenshotFile);
  }

  form.reset();
  formPriority = DEFAULT_PRIORITY;
  formCategories = new Set();
  formOutputTypes = new Set(DEFAULT_OUTPUT_TYPES);
  formResearchMode = DEFAULT_RESEARCH_MODE;
  formRecurringFrequency = DEFAULT_RECURRING_FREQUENCY;
  formScreenshotFile = null;
  resetScreenshotField(screenshotInput, screenshotPreview, screenshotClearBtn);
  renderPriorityPicker();
  renderCategoryPicker();
  renderOutputTypePicker();
  renderResearchModePicker();
  renderRecurringFrequencyPicker();
  recurringFrequencyBlock.hidden = true;
  addMemoModal.hidden = true;
  await fetchMemos();
});

addMemoFab.addEventListener("click", () => {
  addMemoModal.hidden = false;
});
addMemoClose.addEventListener("click", () => {
  addMemoModal.hidden = true;
});
addMemoModal.addEventListener("click", (e) => {
  if (e.target === addMemoModal) addMemoModal.hidden = true;
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
});

renderPriorityPicker();
renderOutputTypePicker();
renderResearchModePicker();
renderRecurringFrequencyPicker();
fetchMemos();
fetchCategories();
