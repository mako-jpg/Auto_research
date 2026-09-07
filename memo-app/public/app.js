const STATUS_LABELS = {
  pending: "未着手",
  researching: "リサーチ中",
  drafted: "下書き完了",
  done: "完了",
  archived: "アーカイブ",
};

const OUTPUT_LABELS = { research: "リサーチ", article: "記事下書き", video: "動画構成" };
const DEFAULT_PRIORITY = 3;
const FILTER_STATUSES = ["pending", "researching", "done"];
const EDITABLE_STATUSES = ["pending", "done", "archived"];

const STATUS_TAG_COLORS = {
  pending: "gray",
  researching: "yellow",
  drafted: "blue",
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
const outputPageContent = document.getElementById("output-page-content");

const memoModal = document.getElementById("memo-modal");
const memoModalTitle = document.getElementById("memo-modal-title");
const memoModalClose = document.getElementById("memo-modal-close");
const memoView = document.getElementById("memo-view");
const memoViewBadges = document.getElementById("memo-view-badges");
const memoViewBrief = document.getElementById("memo-view-brief");
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
const editError = document.getElementById("edit-error");

let memos = [];
let categories = [];
let activeFilter = "all";
let formPriority = DEFAULT_PRIORITY;
let formCategories = new Set();

let currentMemoId = null;
let editPriorityValue = DEFAULT_PRIORITY;
let editCategoriesValue = new Set();

let currentOutputMemo = null;
let currentOutputType = null;

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, credentials: "same-origin" });
  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("unauthorized");
  }
  return res;
}

function availableOutputTypes(memo) {
  return Object.keys(memo.outputs || {}).filter((key) => memo.outputs[key]);
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
      renderOutputTabs();
      loadOutputContent();
    });
    outputTabs.appendChild(btn);
  }
}

async function loadOutputContent() {
  outputPageContent.textContent = "読み込み中…";
  try {
    const res = await api(`/api/memos/${currentOutputMemo.id}/outputs/${currentOutputType}`);
    outputPageContent.textContent = res.ok ? await res.text() : "まだ生成されていません。";
  } catch {
    outputPageContent.textContent = "読み込みに失敗しました。";
  }
}

function openOutputPage(memo, type) {
  const types = availableOutputTypes(memo);
  if (types.length === 0) return;

  currentOutputMemo = memo;
  currentOutputType = types.includes(type) ? type : types[0];
  outputPageTitle.textContent = memo.title;
  renderOutputTabs();
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
  const withOutputs = memos.filter((m) => Object.values(m.outputs || {}).some(Boolean));
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
  for (const category of memo.categories || []) {
    const categoryEl = document.createElement("span");
    categoryEl.className = `tag tag-${categoryTagColor(category)}`;
    categoryEl.textContent = category;
    meta.appendChild(categoryEl);
  }
  card.appendChild(meta);

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

  for (const category of memo.categories || []) {
    const categoryEl = document.createElement("span");
    categoryEl.className = `tag tag-${categoryTagColor(category)}`;
    categoryEl.textContent = category;
    memoViewBadges.appendChild(categoryEl);
  }

  memoViewBrief.textContent = memo.brief;

  memoViewOutputs.innerHTML = "";
  const availableOutputs = Object.keys(memo.outputs || {}).filter((key) => memo.outputs[key]);
  for (const key of availableOutputs) {
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
  editPriorityValue = memo.priority;
  editCategoriesValue = new Set(memo.categories || []);
  renderEditPriorityPicker();
  renderEditCategoryPicker();
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
    priority: editPriorityValue,
    categories: [...editCategoriesValue],
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
    priority: formPriority,
    categories: [...formCategories],
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

  form.reset();
  formPriority = DEFAULT_PRIORITY;
  formCategories = new Set();
  renderPriorityPicker();
  renderCategoryPicker();
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
fetchMemos();
fetchCategories();
