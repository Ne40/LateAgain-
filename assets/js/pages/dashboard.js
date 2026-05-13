import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase.js";
import { upsertUserStats } from "../services/profile.service.js";
import {
  $,
  initAuthPage,
  showMessage,
  formatMonthId,
  formatDateId,
  monthLabel,
  quadrantLabel,
  escapeHtml
} from "./shared.js";

const state = {
  user: null,
  viewDate: new Date(),
  selectedDate: formatDateId(new Date()),
  items: [],
  matrix: [],
  unsubItems: null,
  unsubMatrix: null
};

const qids = [
  "urgent-important",
  "urgent-not-important",
  "not-urgent-important",
  "not-urgent-not-important"
];

function isCompleted(item) {
  return Boolean(item.completed ?? item.done);
}

function byTime(a, b) {
  return (a.startTime || "").localeCompare(b.startTime || "");
}

function selectedMonthId() {
  return formatMonthId(state.viewDate);
}

function getItemMonthId(item) {
  return item.monthKey || (item.date ? item.date.slice(0, 7) : "");
}

function monthItems() {
  const monthId = selectedMonthId();
  return state.items.filter((item) => getItemMonthId(item) === monthId);
}

function monthMatrixItems() {
  const monthId = selectedMonthId();
  return state.matrix.filter((item) => item.monthKey === monthId);
}

function setDefaults() {
  if ($("#itemDate")) $("#itemDate").value = state.selectedDate;
  if ($("#startTime") && !$("#startTime").value) $("#startTime").value = "09:00";
  if ($("#endTime") && !$("#endTime").value) $("#endTime").value = "10:00";
}

function resetItemForm() {
  $("#editingItemId").value = "";
  $("#itemForm").reset();
  $("#itemFormMode").textContent = "Add item";
  $("#itemSubmitBtn").textContent = "Add to calendar";
  $("#cancelItemEdit").classList.add("hidden");
  setDefaults();
}

function resetMatrixForm() {
  $("#editingMatrixId").value = "";
  $("#matrixForm").reset();
  $("#matrixSubmitBtn").textContent = "Add";
  $("#cancelMatrixEdit").classList.add("hidden");
}

function renderCalendar() {
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const first = new Date(year, month, 1).getDay();
  const today = formatDateId(new Date());
  const visibleItems = monthItems();

  $("#monthTitle").textContent = monthLabel(state.viewDate);
  $("#matrixMonthTitle").textContent = `Priority matrix · ${monthLabel(state.viewDate)}`;
  $("#selectedDateChip").textContent = state.selectedDate;

  let html = "";
  for (let i = 0; i < first; i += 1) html += `<div class="day empty"></div>`;

  for (let d = 1; d <= days; d += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const items = visibleItems.filter((item) => item.date === date);
    const tasks = items.filter((item) => item.type === "task");
    const done = tasks.filter(isCompleted).length;
    const events = items.filter((item) => item.type === "event").length;

    html += `
      <button class="day ${date === today ? "today" : ""} ${date === state.selectedDate ? "selected" : ""}" data-date="${date}">
        <b>${d}</b>
        <span>${events ? `${events} event${events > 1 ? "s" : ""}` : ""}</span>
        <span>${tasks.length ? `${done}/${tasks.length} tasks` : ""}</span>
      </button>`;
  }

  $("#calendarGrid").innerHTML = html;
  document.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = button.dataset.date;
      setDefaults();
      render();
    });
  });
}

function renderDay() {
  $("#dayTitle").textContent = `Schedule · ${state.selectedDate}`;
  const list = state.items
    .filter((item) => item.date === state.selectedDate)
    .sort(byTime);

  if (!list.length) {
    $("#dayList").innerHTML = `<div class="empty-box"><b>No items.</b><p>Add event or task with time.</p></div>`;
    return;
  }

  $("#dayList").innerHTML = list.map((item) => `
    <div class="schedule ${isCompleted(item) ? "done" : ""}">
      <div><b>${escapeHtml(item.startTime || "")} - ${escapeHtml(item.endTime || "")}</b><small>${escapeHtml(item.type || "item")}</small></div>
      <div>
        <h3>${escapeHtml(item.title || "Untitled")}</h3>
        ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}
        ${item.quadrant ? `<small class="tag">${quadrantLabel(item.quadrant)}</small>` : ""}
      </div>
      <div class="row-actions">
        ${item.type === "task" ? `<button class="mini" data-done="${item.id}">${isCompleted(item) ? "Undo" : "Done"}</button>` : ""}
        <button class="mini" data-edit-item="${item.id}">Edit</button>
        <button class="mini danger" data-del="${item.id}">Delete</button>
      </div>
    </div>`).join("");

  document.querySelectorAll("[data-done]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = state.items.find((entry) => entry.id === button.dataset.done);
      if (!item) return;
      await updateDoc(doc(db, "users", state.user.uid, "items", item.id), {
        completed: !isCompleted(item),
        done: !isCompleted(item),
        updatedAt: serverTimestamp()
      });
    });
  });

  document.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => startEditItem(button.dataset.editItem));
  });

  document.querySelectorAll("[data-del]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      await deleteDoc(doc(db, "users", state.user.uid, "items", button.dataset.del));
    });
  });
}

function renderStats() {
  const visibleItems = monthItems();
  const tasks = visibleItems.filter((item) => item.type === "task");
  const events = visibleItems.filter((item) => item.type === "event");
  const done = tasks.filter(isCompleted);
  const todayTasks = state.items.filter((item) => item.type === "task" && item.date === state.selectedDate);
  const todayDone = todayTasks.filter(isCompleted);

  const monthScore = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const todayScore = todayTasks.length ? Math.round((todayDone.length / todayTasks.length) * 100) : 0;

  $("#monthlyScore").textContent = `${monthScore}%`;
  $("#todayScore").textContent = `${todayScore}%`;
  $("#taskCount").textContent = tasks.length;
  $("#eventCount").textContent = events.length;

  const donut = $("#donut");
  if (donut) {
    donut.style.setProperty("--value", `${monthScore}%`);
    const span = donut.querySelector("span");
    if (span) span.textContent = `${monthScore}%`;
  }

  drawChart(monthScore);
}

function drawChart(score) {
  const canvas = $("#productivityChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 42;
  const year = state.viewDate.getFullYear();
  const month = state.viewDate.getMonth();
  const days = new Date(year, month + 1, 0).getDate();

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#272929";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#797366";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = "#D5BF98";
  ctx.font = "20px 'OCR A Extended', 'OCR A', monospace";
  ctx.fillText(`Monthly completion: ${score}%`, padding, 36);

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = Math.max(6, chartWidth / days - 4);

  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const tasks = state.items.filter((item) => item.type === "task" && item.date === date);
    const done = tasks.filter(isCompleted);
    const ratio = tasks.length ? done.length / tasks.length : 0;
    const x = padding + (day - 1) * (chartWidth / days);
    const barHeight = Math.max(3, ratio * chartHeight);
    const y = height - padding - barHeight;

    ctx.fillStyle = ratio ? "#D5BF98" : "#3C3A35";
    ctx.fillRect(x, y, barWidth, barHeight);

    if (day === 1 || day === days || day % 5 === 0) {
      ctx.fillStyle = "#B4B299";
      ctx.font = "13px 'OCR A Extended', 'OCR A', monospace";
      ctx.fillText(String(day), x, height - 15);
    }
  }
}

function renderMatrix() {
  const taskItems = monthItems().filter((item) => item.type === "task" && item.quadrant);
  const monthlyPriorityItems = monthMatrixItems();
  const grid = $("#matrixGrid");

  grid.innerHTML = qids.map((qid) => {
    const tasks = taskItems.filter((item) => item.quadrant === qid);
    const matrixItems = monthlyPriorityItems.filter((item) => item.quadrant === qid);
    const hasContent = tasks.length || matrixItems.length;

    return `
      <section class="matrix-box" data-quadrant="${qid}">
        <h3>${quadrantLabel(qid)}</h3>
        ${hasContent ? `
          ${matrixItems.map((item) => `
            <div class="matrix-item soft ${item.completed ? "done" : ""}">
              <button data-mdone="${item.id}" title="Toggle done">${item.completed ? "✓" : ""}</button>
              <span><strong>${escapeHtml(item.title || "Untitled")}</strong><small>monthly priority</small></span>
              <button data-medit="${item.id}" title="Edit">✎</button>
              <button data-mdel="${item.id}" title="Delete">×</button>
            </div>`).join("")}
          ${tasks.map((item) => `
            <div class="matrix-task ${isCompleted(item) ? "done" : ""}">
              <strong>${escapeHtml(item.title || "Untitled")}</strong>
              <span class="muted">${escapeHtml(item.date || "")} · ${escapeHtml(item.startTime || "")}–${escapeHtml(item.endTime || "")}</span>
              <div class="row-actions">
                <button class="mini" data-edit-item="${item.id}">Edit</button>
                <button class="mini" data-done="${item.id}">${isCompleted(item) ? "Undo" : "Done"}</button>
              </div>
            </div>`).join("")}
        ` : `<p class="muted">Nothing here.</p>`}
      </section>`;
  }).join("");

  grid.querySelectorAll("[data-mdone]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = state.matrix.find((entry) => entry.id === button.dataset.mdone);
      if (!item) return;
      await updateDoc(doc(db, "users", state.user.uid, "matrixItems", item.id), {
        completed: !item.completed,
        updatedAt: serverTimestamp()
      });
    });
  });

  grid.querySelectorAll("[data-medit]").forEach((button) => {
    button.addEventListener("click", () => startEditMatrix(button.dataset.medit));
  });

  grid.querySelectorAll("[data-mdel]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this matrix priority?")) return;
      await deleteDoc(doc(db, "users", state.user.uid, "matrixItems", button.dataset.mdel));
    });
  });

  grid.querySelectorAll("[data-edit-item]").forEach((button) => {
    button.addEventListener("click", () => startEditItem(button.dataset.editItem));
  });

  grid.querySelectorAll("[data-done]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = state.items.find((entry) => entry.id === button.dataset.done);
      if (!item) return;
      await updateDoc(doc(db, "users", state.user.uid, "items", item.id), {
        completed: !isCompleted(item),
        done: !isCompleted(item),
        updatedAt: serverTimestamp()
      });
    });
  });
}

function render() {
  renderCalendar();
  renderDay();
  renderStats();
  renderMatrix();
}

async function updateStats() {
  if (!state.user) return;
  const tasks = monthItems().filter((item) => item.type === "task");
  const completedTasks = tasks.filter(isCompleted).length;
  const productivityScore = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  try {
    await upsertUserStats(state.user.uid, selectedMonthId(), {
      monthId: selectedMonthId(),
      totalTasks: tasks.length,
      completedTasks,
      productivityScore
    });
  } catch (error) {
    console.warn("Could not update stats:", error);
  }
}

function listenData() {
  if (state.unsubItems) state.unsubItems();
  if (state.unsubMatrix) state.unsubMatrix();

  state.unsubItems = onSnapshot(
    collection(db, "users", state.user.uid, "items"),
    async (snapshot) => {
      state.items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      render();
      await updateStats();
    },
    (error) => {
      console.error("Items listener error:", error);
      showMessage("#itemMessage", "Could not read calendar items. Check Firestore rules.", "error");
    }
  );

  state.unsubMatrix = onSnapshot(
    collection(db, "users", state.user.uid, "matrixItems"),
    (snapshot) => {
      state.matrix = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      renderMatrix();
    },
    (error) => {
      console.error("Matrix listener error:", error);
      showMessage("#matrixMessage", "Could not read matrix items. Check Firestore rules.", "error");
    }
  );
}

function startEditItem(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  $("#editingItemId").value = item.id;
  $("#itemType").value = item.type || "task";
  $("#itemTitle").value = item.title || "";
  $("#itemDate").value = item.date || state.selectedDate;
  $("#itemQuadrant").value = item.quadrant || "";
  $("#startTime").value = item.startTime || "09:00";
  $("#endTime").value = item.endTime || "10:00";
  $("#itemNotes").value = item.notes || "";
  $("#itemFormMode").textContent = "Edit item";
  $("#itemSubmitBtn").textContent = "Save changes";
  $("#cancelItemEdit").classList.remove("hidden");
  document.querySelector("#calendar").scrollIntoView({ behavior: "smooth", block: "start" });
}

function startEditMatrix(itemId) {
  const item = state.matrix.find((entry) => entry.id === itemId);
  if (!item) return;

  $("#editingMatrixId").value = item.id;
  $("#matrixTitle").value = item.title || "";
  $("#matrixQuadrant").value = item.quadrant || "urgent-important";
  $("#matrixSubmitBtn").textContent = "Save";
  $("#cancelMatrixEdit").classList.remove("hidden");
  document.querySelector("#matrix").scrollIntoView({ behavior: "smooth", block: "start" });
}

function moveMonth(offset) {
  state.viewDate = new Date(state.viewDate.getFullYear(), state.viewDate.getMonth() + offset, 1);
  state.selectedDate = `${state.viewDate.getFullYear()}-${String(state.viewDate.getMonth() + 1).padStart(2, "0")}-01`;
  resetItemForm();
  render();
  updateStats();
}

function bindEvents() {
  $("#prevMonthBtn").addEventListener("click", () => moveMonth(-1));
  $("#nextMonthBtn").addEventListener("click", () => moveMonth(1));
  $("#todayBtn").addEventListener("click", () => {
    state.viewDate = new Date();
    state.selectedDate = formatDateId(new Date());
    resetItemForm();
    render();
    updateStats();
  });

  $("#cancelItemEdit").addEventListener("click", () => {
    resetItemForm();
    showMessage("#itemMessage", "");
  });

  $("#cancelMatrixEdit").addEventListener("click", () => {
    resetMatrixForm();
    showMessage("#matrixMessage", "");
  });

  $("#itemForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const editId = $("#editingItemId").value;
    const button = $("#itemSubmitBtn");
    button.disabled = true;

    const payload = {
      type: $("#itemType").value,
      title: $("#itemTitle").value.trim(),
      date: $("#itemDate").value,
      startTime: $("#startTime").value,
      endTime: $("#endTime").value,
      notes: $("#itemNotes").value.trim(),
      quadrant: $("#itemQuadrant").value,
      monthKey: $("#itemDate").value.slice(0, 7),
      updatedAt: serverTimestamp()
    };

    if (!payload.title || !payload.date || !payload.startTime || !payload.endTime) {
      showMessage("#itemMessage", "Fill all required fields.", "error");
      button.disabled = false;
      return;
    }

    if (payload.endTime <= payload.startTime) {
      showMessage("#itemMessage", "End time should be after start time.", "error");
      button.disabled = false;
      return;
    }

    try {
      if (editId) {
        await updateDoc(doc(db, "users", state.user.uid, "items", editId), payload);
        showMessage("#itemMessage", "Updated successfully.", "ok");
      } else {
        await addDoc(collection(db, "users", state.user.uid, "items"), {
          ...payload,
          completed: false,
          done: false,
          createdAt: serverTimestamp()
        });
        showMessage("#itemMessage", "Added successfully.", "ok");
      }

      state.selectedDate = payload.date;
      state.viewDate = new Date(`${payload.date}T12:00:00`);
      resetItemForm();
      render();
    } catch (error) {
      console.error(error);
      showMessage("#itemMessage", "Firebase refused the save. Check Firestore rules.", "error");
    } finally {
      button.disabled = false;
    }
  });

  $("#matrixForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const editId = $("#editingMatrixId").value;
    const button = $("#matrixSubmitBtn");
    button.disabled = true;

    const payload = {
      title: $("#matrixTitle").value.trim(),
      quadrant: $("#matrixQuadrant").value,
      monthKey: selectedMonthId(),
      updatedAt: serverTimestamp()
    };

    if (!payload.title) {
      showMessage("#matrixMessage", "Write a priority title first.", "error");
      button.disabled = false;
      return;
    }

    try {
      if (editId) {
        await updateDoc(doc(db, "users", state.user.uid, "matrixItems", editId), payload);
        showMessage("#matrixMessage", "Matrix item updated.", "ok");
      } else {
        await addDoc(collection(db, "users", state.user.uid, "matrixItems"), {
          ...payload,
          completed: false,
          createdAt: serverTimestamp()
        });
        showMessage("#matrixMessage", "Matrix item added.", "ok");
      }

      resetMatrixForm();
    } catch (error) {
      console.error(error);
      showMessage("#matrixMessage", "Firebase refused the matrix save. Check Firestore rules.", "error");
    } finally {
      button.disabled = false;
    }
  });
}

initAuthPage(async (user) => {
  state.user = user;
  setDefaults();
  bindEvents();
  render();
  listenData();
});

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileBackdrop = document.getElementById("mobileBackdrop");

function getSidebar() {
  return (
    document.querySelector(".sidebar") ||
    document.querySelector("aside.sidebar") ||
    document.querySelector(".side-nav")
  );
}

function openMobileSidebar() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  sidebar.classList.add("open");
  mobileBackdrop?.classList.add("show");
}

function closeMobileSidebar() {
  const sidebar = getSidebar();
  if (!sidebar) return;

  sidebar.classList.remove("open");
  mobileBackdrop?.classList.remove("show");
}

mobileMenuBtn?.addEventListener("click", openMobileSidebar);
mobileBackdrop?.addEventListener("click", closeMobileSidebar);

document.querySelectorAll(".sidebar a, .side-nav a").forEach((link) => {
  link.addEventListener("click", closeMobileSidebar);
});