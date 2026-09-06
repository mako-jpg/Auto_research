const STATUS_LABELS = {
  pending: "未着手",
  researching: "リサーチ中",
  drafted: "下書き完了",
  done: "完了",
  archived: "アーカイブ",
};

const OUTPUT_LABELS = { research: "リサーチ", article: "記事下書き", video: "動画構成" };

const memoList = document.getElementById("memo-list");
const emptyState = document.getElementById("empty-state");
const form = document.getElementById("memo-form");
const formError = document.getElementById("form-error");
const statusFilters = document.getElementById("status-filters");
const logoutBtn = document.getElementById("logout-btn");
const outputModal = document.getElementById("output-modal");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

let memos = [];
let activeFilter = "all";

async function openOutput(memo, type) {
  modalTitle.textContent = `${memo.title} — ${OUTPUT_LABELS[type] || type}`;
  modalBody.textContent = "読み込み中…";
  outputModal.hidden = false;

  try {
    const res = await api(`/api/memos/${memo.id}/outputs/${type}`);
    modalBody.textContent = res.ok ? await res.text() : "まだ生成されていません。";
  } catch {
    modalBody.textContent = "読み込みに失敗しました。";
  }
}

modalClose.addEventListener("click", () => {
  outputModal.hidden = true;
});
outputModal.addEventListener("click", (e) => {
  if (e.target === outputModal) outputModal.hidden = true;
});

async function api(path, options = {}) {
  const res = await fetch(path, { ...options, credentials: "same-origin" });
  if (res.status === 401) {
    window.location.href = "/login.html";
    throw new Error("unauthorized");
  }
  return res;
}

async function fetchMemos() {
  const res = await api("/api/memos");
  memos = await res.json();
  renderFilters();
  render();
}

function renderFilters() {
  const counts = { all: memos.length };
  for (const m of memos) counts[m.status] = (counts[m.status] || 0) + 1;

  const options = [["all", "すべて"], ...Object.entries(STATUS_LABELS)];
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

  const head = document.createElement("div");
  head.className = "memo-item-head";

  const titleWrap = document.createElement("div");
  const title = document.createElement("p");
  title.className = "memo-title";
  title.textContent = memo.title;
  titleWrap.appendChild(title);

  const badges = document.createElement("div");
  badges.className = "memo-meta";

  const statusBadge = document.createElement("span");
  statusBadge.className = `badge status-${memo.status}`;
  statusBadge.textContent = STATUS_LABELS[memo.status] || memo.status;
  badges.appendChild(statusBadge);

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge priority-${memo.priority}`;
  priorityBadge.textContent = { high: "優先度高", normal: "優先度普通", low: "優先度低" }[memo.priority] || memo.priority;
  badges.appendChild(priorityBadge);

  for (const tag of memo.tags || []) {
    const tagEl = document.createElement("span");
    tagEl.className = "tag";
    tagEl.textContent = `#${tag}`;
    badges.appendChild(tagEl);
  }

  head.appendChild(titleWrap);
  li.appendChild(head);

  const brief = document.createElement("p");
  brief.className = "memo-brief";
  brief.textContent = memo.brief;
  li.appendChild(brief);

  li.appendChild(badges);

  if (memo.notes) {
    const notes = document.createElement("p");
    notes.className = "memo-notes";
    notes.textContent = `補足: ${memo.notes}`;
    li.appendChild(notes);
  }

  const availableOutputs = Object.keys(memo.outputs || {}).filter((key) => memo.outputs[key]);
  if (availableOutputs.length > 0) {
    const outputs = document.createElement("div");
    outputs.className = "memo-outputs";
    for (const key of availableOutputs) {
      const btn = document.createElement("button");
      btn.className = "output-btn";
      btn.textContent = OUTPUT_LABELS[key] || key;
      btn.addEventListener("click", () => openOutput(memo, key));
      outputs.appendChild(btn);
    }
    li.appendChild(outputs);
  }

  const actions = document.createElement("div");
  actions.className = "memo-actions";

  const statusSelect = document.createElement("select");
  for (const [value, label] of Object.entries(STATUS_LABELS)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    if (value === memo.status) opt.selected = true;
    statusSelect.appendChild(opt);
  }
  statusSelect.addEventListener("change", () => updateMemo(memo.id, { status: statusSelect.value }));
  actions.appendChild(statusSelect);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "danger";
  deleteBtn.textContent = "削除";
  deleteBtn.addEventListener("click", () => deleteMemo(memo.id));
  actions.appendChild(deleteBtn);

  li.appendChild(actions);
  return li;
}

async function updateMemo(id, patch) {
  await api(`/api/memos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  await fetchMemos();
}

async function deleteMemo(id) {
  if (!confirm("このメモを削除しますか？")) return;
  await api(`/api/memos/${id}`, { method: "DELETE" });
  await fetchMemos();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const payload = {
    title: document.getElementById("title").value,
    brief: document.getElementById("brief").value,
    priority: document.getElementById("priority").value,
    tags: document.getElementById("tags").value,
    notes: document.getElementById("notes").value,
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
  document.getElementById("priority").value = "normal";
  await fetchMemos();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login.html";
});

fetchMemos();
