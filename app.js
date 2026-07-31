import { parseDiscordPaste } from "./parser.js";
import {
  createId,
  fingerprint,
  loadGoodies,
  saveGoodies,
  toCsv,
} from "./storage.js";

const state = {
  goodies: loadGoodies(),
  view: "swipe",
  filter: "all",
  preview: [],
  history: [],
  drag: null,
};

const els = {
  statsLine: document.getElementById("statsLine"),
  deck: document.getElementById("deck"),
  swipeEmpty: document.getElementById("swipeEmpty"),
  swipeActions: document.getElementById("swipeActions"),
  pasteArea: document.getElementById("pasteArea"),
  previewPanel: document.getElementById("previewPanel"),
  previewList: document.getElementById("previewList"),
  previewCount: document.getElementById("previewCount"),
  selectAllPreview: document.getElementById("selectAllPreview"),
  catalogList: document.getElementById("catalogList"),
  catalogEmpty: document.getElementById("catalogEmpty"),
  toast: document.getElementById("toast"),
  quickAddDialog: document.getElementById("quickAddDialog"),
  quickAddForm: document.getElementById("quickAddForm"),
};

function persist() {
  saveGoodies(state.goodies);
  render();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

function pendingGoodies() {
  return state.goodies.filter((g) => g.status === "pending");
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `view-${view}`);
  });
  render();
}

function renderStats() {
  const pending = pendingGoodies().length;
  const validated = state.goodies.filter((g) => g.status === "validated").length;
  const archived = state.goodies.filter((g) => g.status === "archived").length;
  els.statsLine.textContent = `${pending} en attente · ${validated} validés · ${archived} archivés`;
}

function renderSwipe() {
  const queue = pendingGoodies();
  const existingCards = els.deck.querySelectorAll(".card");
  existingCards.forEach((card) => card.remove());

  if (!queue.length) {
    els.swipeEmpty.hidden = false;
    els.swipeActions.hidden = true;
    return;
  }

  els.swipeEmpty.hidden = true;
  els.swipeActions.hidden = false;

  const visible = queue.slice(0, 3).reverse();
  visible.forEach((item, index) => {
    const isTop = index === visible.length - 1;
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = item.id;
    card.innerHTML = `
      <div class="stamp stamp-yes">VALIDÉ</div>
      <div class="stamp stamp-no">ARCHIVÉ</div>
      <div class="card-content">
        <p class="meta">${item.stand || item.author || "Discord"}</p>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description || "")}</p>
      </div>
    `;
    if (!isTop) {
      const depth = visible.length - 1 - index;
      card.style.transform = `scale(${1 - depth * 0.04}) translateY(${depth * 10}px)`;
      card.style.opacity = String(1 - depth * 0.08);
    } else {
      bindCardGestures(card);
    }
    els.deck.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bindCardGestures(card) {
  const onPointerDown = (event) => {
    card.setPointerCapture(event.pointerId);
    state.drag = {
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
    };
    card.style.transition = "none";
  };

  const onPointerMove = (event) => {
    if (!state.drag) return;
    state.drag.x = event.clientX - state.drag.startX;
    state.drag.y = event.clientY - state.drag.startY;
    const rot = state.drag.x / 18;
    card.style.transform = `translate(${state.drag.x}px, ${state.drag.y}px) rotate(${rot}deg)`;
    const yes = card.querySelector(".stamp-yes");
    const no = card.querySelector(".stamp-no");
    yes.style.opacity = String(Math.min(1, Math.max(0, state.drag.x / 120)));
    no.style.opacity = String(Math.min(1, Math.max(0, -state.drag.x / 120)));
  };

  const onPointerUp = () => {
    if (!state.drag) return;
    const { x } = state.drag;
    state.drag = null;
    card.style.transition = "transform 220ms ease, opacity 220ms ease";
    if (x > 120) {
      flyAway(card, 1);
      decide(card.dataset.id, "validated");
    } else if (x < -120) {
      flyAway(card, -1);
      decide(card.dataset.id, "archived");
    } else {
      card.style.transform = "";
      card.querySelector(".stamp-yes").style.opacity = "0";
      card.querySelector(".stamp-no").style.opacity = "0";
    }
  };

  card.addEventListener("pointerdown", onPointerDown);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerUp);
  card.addEventListener("pointercancel", onPointerUp);
}

function flyAway(card, direction) {
  card.style.transform = `translate(${direction * 480}px, 40px) rotate(${direction * 24}deg)`;
  card.style.opacity = "0";
}

function decide(id, status) {
  const item = state.goodies.find((g) => g.id === id);
  if (!item || item.status !== "pending") return;
  state.history.push({ id, prev: item.status });
  item.status = status;
  item.updatedAt = new Date().toISOString();
  persist();
  showToast(status === "validated" ? "Goodie validé" : "Goodie archivé");
}

function undo() {
  const last = state.history.pop();
  if (!last) {
    showToast("Rien à annuler");
    return;
  }
  const item = state.goodies.find((g) => g.id === last.id);
  if (!item) return;
  item.status = "pending";
  item.updatedAt = new Date().toISOString();
  persist();
  showToast("Annulé");
}

function renderPreview() {
  els.previewCount.textContent = String(state.preview.length);
  els.previewPanel.hidden = !state.preview.length;
  els.previewList.innerHTML = "";

  state.preview.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "preview-item";
    li.innerHTML = `
      <input type="checkbox" data-index="${index}" ${item.selected ? "checked" : ""} />
      <div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.description)}</p>
        <p class="meta">${escapeHtml(item.author || "Auteur inconnu")}</p>
      </div>
    `;
    els.previewList.appendChild(li);
  });
}

function renderCatalog() {
  const list =
    state.filter === "all"
      ? state.goodies
      : state.goodies.filter((g) => g.status === state.filter);

  els.catalogList.innerHTML = "";
  els.catalogEmpty.hidden = list.length > 0;

  const sorted = [...list].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  sorted.forEach((item) => {
    const li = document.createElement("li");
    li.className = "catalog-item";
    li.innerHTML = `
      <div class="catalog-item-head">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || "")}</p>
          <p class="meta">${escapeHtml([item.stand, item.author].filter(Boolean).join(" · ") || item.source)}</p>
          <span class="status status-${item.status}">${labelStatus(item.status)}</span>
        </div>
        <button type="button" class="icon-btn btn-danger-soft" data-delete="${item.id}" aria-label="Supprimer">🗑</button>
      </div>
    `;
    els.catalogList.appendChild(li);
  });
}

function labelStatus(status) {
  if (status === "validated") return "Validé";
  if (status === "archived") return "Archivé";
  return "En attente";
}

function render() {
  renderStats();
  if (state.view === "swipe") renderSwipe();
  if (state.view === "import") renderPreview();
  if (state.view === "catalog") renderCatalog();
}

function existingFingerprints() {
  return new Set(state.goodies.map((g) => fingerprint(g.raw || g.title)));
}

function importSelected() {
  const selected = state.preview.filter((p) => p.selected);
  if (!selected.length) {
    showToast("Sélectionne au moins un goodie");
    return;
  }

  const known = existingFingerprints();
  let added = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  selected.forEach((item) => {
    const fp = fingerprint(item.raw || item.title);
    if (known.has(fp)) {
      skipped += 1;
      return;
    }
    known.add(fp);
    state.goodies.unshift({
      id: createId(),
      title: item.title,
      description: item.description,
      stand: item.stand || "",
      author: item.author || "",
      raw: item.raw || item.title,
      source: "discord-paste",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    added += 1;
  });

  state.preview = [];
  els.pasteArea.value = "";
  els.previewPanel.hidden = true;
  persist();
  setView("swipe");
  showToast(`${added} importé(s)${skipped ? ` · ${skipped} doublon(s)` : ""}`);
}

function exportCsv() {
  if (!state.goodies.length) {
    showToast("Rien à exporter");
    return;
  }
  const csv = toCsv(state.goodies);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const day = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gamescom-goodies-${day}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV téléchargé — ouvrable dans Google Sheets");
}

function openQuickAdd() {
  els.quickAddForm.reset();
  els.quickAddDialog.showModal();
  document.getElementById("qaTitle").focus();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

document.querySelectorAll("[data-go]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.go));
});

document.getElementById("btnQuickAdd").addEventListener("click", openQuickAdd);
document.getElementById("btnQuickAddEmpty").addEventListener("click", openQuickAdd);
document.getElementById("btnCancelQuickAdd").addEventListener("click", () => {
  els.quickAddDialog.close();
});

els.quickAddForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("qaTitle").value.trim();
  const stand = document.getElementById("qaStand").value.trim();
  const description = document.getElementById("qaDesc").value.trim();
  if (!title) return;

  const now = new Date().toISOString();
  state.goodies.unshift({
    id: createId(),
    title,
    description,
    stand,
    author: "",
    raw: `${title}\n${description}`.trim(),
    source: "manual",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  els.quickAddDialog.close();
  persist();
  setView("swipe");
  showToast("Goodie ajouté");
});

document.getElementById("btnParse").addEventListener("click", () => {
  const parsed = parseDiscordPaste(els.pasteArea.value);
  state.preview = parsed.map((item) => ({ ...item, selected: true }));
  els.selectAllPreview.checked = true;
  renderPreview();
  if (!parsed.length) showToast("Aucun message détecté");
});

document.getElementById("btnClearPaste").addEventListener("click", () => {
  els.pasteArea.value = "";
  state.preview = [];
  renderPreview();
});

els.selectAllPreview.addEventListener("change", () => {
  const checked = els.selectAllPreview.checked;
  state.preview.forEach((item) => {
    item.selected = checked;
  });
  renderPreview();
});

els.previewList.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
  const index = Number(target.dataset.index);
  if (state.preview[index]) state.preview[index].selected = target.checked;
});

document.getElementById("btnConfirmImport").addEventListener("click", importSelected);
document.getElementById("btnValidate").addEventListener("click", () => {
  const top = pendingGoodies()[0];
  if (top) decide(top.id, "validated");
});
document.getElementById("btnArchive").addEventListener("click", () => {
  const top = pendingGoodies()[0];
  if (top) decide(top.id, "archived");
});
document.getElementById("btnUndo").addEventListener("click", undo);
document.getElementById("btnExport").addEventListener("click", exportCsv);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.filter = chip.dataset.filter;
    document.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("is-active", c === chip);
    });
    renderCatalog();
  });
});

els.catalogList.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-delete]");
  if (!btn) return;
  const id = btn.getAttribute("data-delete");
  state.goodies = state.goodies.filter((g) => g.id !== id);
  persist();
  showToast("Supprimé");
});

render();
