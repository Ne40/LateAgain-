import {
  initAuthPage,
  $,
  showMessage,
  escapeHtml,
  emptyState,
  quadrantLabel,
  drawBarChart
} from "./shared.js";

import {
  getProject,
  listenProject,
  listenProjectMembers,
  inviteUserToProject,
  addProjectTask,
  listenProjectTasks,
  updateProjectTaskStatus
} from "../services/projects.service.js";

import {
  sendProjectMessage,
  listenProjectMessages
} from "../services/chat.service.js";

const params = new URLSearchParams(location.search);
const projectId = params.get("id");

const state = {
  user: null,
  project: null,
  members: [],
  tasks: [],
  messages: [],
  unsubscribers: []
};

if (!projectId) {
  alert("Missing project id.");
  location.href = "./projects.html";
}

function cleanup() {
  state.unsubscribers.forEach((unsub) => {
    try { unsub(); } catch {}
  });
}

window.addEventListener("beforeunload", cleanup);

function bindListeners() {
  state.unsubscribers.push(
    listenProject(projectId, (project) => {
      state.project = project;
      renderProjectHeader();
    })
  );

  state.unsubscribers.push(
    listenProjectMembers(projectId, (members) => {
      state.members = members;
      renderMembers();
      renderAssignedToOptions();
      renderTasks();
    })
  );

  state.unsubscribers.push(
    listenProjectTasks(projectId, (tasks) => {
      state.tasks = tasks;
      renderTasks();
      renderProjectStats();
      renderProjectChart();
    })
  );

  state.unsubscribers.push(
    listenProjectMessages(projectId, (messages) => {
      state.messages = messages;
      renderMessages();
    })
  );
}

function renderProjectHeader() {
  if (!state.project) return;

  $("#projectTitle").textContent = state.project.name || "Project";
  $("#projectDescriptionText").textContent = state.project.description || "";
}

function renderMembers() {
  const list = $("#membersList");

  if (!state.members.length) {
    list.innerHTML = emptyState("No members loaded.");
    return;
  }

  list.innerHTML = state.members.map((member) => `
    <article class="item-card">
      <strong>${escapeHtml(member.email)}</strong>
      <span class="muted">Role: ${escapeHtml(member.role || "member")}</span>
    </article>
  `).join("");
}

function renderAssignedToOptions() {
  const select = $("#assignedTo");

  select.innerHTML = state.members.map((member) => `
    <option value="${escapeHtml(member.uid)}">${escapeHtml(member.email)}</option>
  `).join("");
}

function renderTasks() {
  const list = $("#projectTasksList");

  if (!state.tasks.length) {
    list.innerHTML = emptyState("No tasks yet.");
    return;
  }

  list.innerHTML = state.tasks.map((task) => {
    const assigned = state.members.find((member) => member.uid === task.assignedTo);
    return `
      <article class="item-card ${task.status === "done" ? "done" : ""}">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <div class="item-meta">
            <span>${escapeHtml(task.status)}</span>
            <span>${escapeHtml(task.dueDate || "")}</span>
            <span>${escapeHtml(task.startTime || "")} → ${escapeHtml(task.endTime || "")}</span>
            <span>${quadrantLabel(task.quadrant)}</span>
          </div>
        </div>

        ${task.description ? `<p class="muted">${escapeHtml(task.description)}</p>` : ""}
        <p class="muted tiny">Assigned to: ${escapeHtml(assigned?.email || task.assignedToEmail || "Unknown")}</p>

        <div class="item-actions">
          <button class="btn secondary" data-status="${task.status === "done" ? "todo" : "done"}" data-id="${task.id}">
            ${task.status === "done" ? "Reopen" : "Mark done"}
          </button>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      await updateProjectTaskStatus(projectId, button.dataset.id, button.dataset.status);
    });
  });
}

function renderProjectStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.status === "done").length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  $("#projectTaskCount").textContent = total;
  $("#projectDoneCount").textContent = done;
  $("#projectProgress").textContent = `${progress}%`;
}

function renderProjectChart() {
  const byMember = new Map();

  state.members.forEach((member) => {
    byMember.set(member.uid, {
      label: member.email.split("@")[0].slice(0, 7),
      total: 0,
      done: 0
    });
  });

  state.tasks.forEach((task) => {
    const memberData = byMember.get(task.assignedTo) || {
      label: "Unknown",
      total: 0,
      done: 0
    };

    memberData.total += 1;
    if (task.status === "done") memberData.done += 1;
    byMember.set(task.assignedTo, memberData);
  });

  const bars = Array.from(byMember.values()).map((entry) => ({
    label: entry.label,
    value: entry.total ? Math.round((entry.done / entry.total) * 100) : 0
  }));

  drawBarChart($("#projectChart"), bars);
}

function renderMessages() {
  const box = $("#chatMessages");

  if (!state.messages.length) {
    box.innerHTML = emptyState("No messages yet.");
    return;
  }

  box.innerHTML = state.messages.map((message) => `
    <div class="chat-bubble ${message.senderId === state.user.uid ? "mine" : ""}">
      <strong>${escapeHtml(message.senderEmail)}</strong>
      <span>${escapeHtml(message.text)}</span>
    </div>
  `).join("");

  box.scrollTop = box.scrollHeight;
}

function bindForms() {
  $("#inviteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    showMessage("#inviteMessage", "Sending invite...");

    try {
      await inviteUserToProject(
        projectId,
        state.project?.name || "Project",
        state.user,
        $("#inviteEmail").value,
        $("#inviteRole").value
      );

      $("#inviteEmail").value = "";
      showMessage("#inviteMessage", "Invite sent.", "ok");
    } catch (error) {
      console.error(error);
      showMessage("#inviteMessage", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  $("#projectTaskForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    showMessage("#taskMessage", "Adding task...");

    try {
      const assignedUid = $("#assignedTo").value;
      const assigned = state.members.find((member) => member.uid === assignedUid);

      await addProjectTask(projectId, state.user, {
        title: $("#taskTitle").value,
        description: $("#taskDescription").value,
        assignedTo: assignedUid,
        assignedToEmail: assigned?.email || "",
        dueDate: $("#taskDueDate").value,
        startTime: $("#taskStartTime").value,
        endTime: $("#taskEndTime").value,
        quadrant: $("#taskQuadrant").value
      });

      $("#taskTitle").value = "";
      $("#taskDescription").value = "";
      showMessage("#taskMessage", "Task added.", "ok");
    } catch (error) {
      console.error(error);
      showMessage("#taskMessage", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  $("#chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value;
    input.value = "";

    try {
      await sendProjectMessage(projectId, state.user, text);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  });
}

initAuthPage(async (user) => {
  state.user = user;

  const project = await getProject(projectId);
  if (!project) {
    alert("Project not found or you do not have access.");
    location.href = "./projects.html";
    return;
  }

  state.project = project;
  renderProjectHeader();
  bindForms();
  bindListeners();
});
