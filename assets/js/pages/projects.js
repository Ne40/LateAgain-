import {
  initAuthPage,
  $,
  showMessage,
  escapeHtml,
  emptyState
} from "./shared.js";

import {
  createProject,
  getMyProjects,
  getMyProjectInvites,
  acceptProjectInvite,
  rejectProjectInvite
} from "../services/projects.service.js";

const state = {
  user: null,
  projects: [],
  invites: []
};

async function refresh() {
  state.projects = await getMyProjects(state.user.uid);
  state.invites = await getMyProjectInvites(state.user.email);
  render();
}

function render() {
  renderProjects();
  renderInvites();
}

function renderProjects() {
  const grid = $("#projectsGrid");

  if (!state.projects.length) {
    grid.innerHTML = emptyState("No projects yet. Create your first one.");
    return;
  }

  grid.innerHTML = state.projects.map((project) => `
    <a class="project-card" href="./project.html?id=${encodeURIComponent(project.projectId)}">
      <h3>${escapeHtml(project.name)}</h3>
      <p class="muted">Role: ${escapeHtml(project.role || "member")}</p>
      <span class="btn secondary">Open board</span>
    </a>
  `).join("");
}

function renderInvites() {
  const list = $("#projectInvites");

  if (!state.invites.length) {
    list.innerHTML = emptyState("No project invitations.");
    return;
  }

  list.innerHTML = state.invites.map((invite) => `
    <article class="item-card">
      <strong>${escapeHtml(invite.projectName)}</strong>
      <span class="muted">From ${escapeHtml(invite.fromEmail)} · Role: ${escapeHtml(invite.role || "member")}</span>
      <div class="item-actions">
        <button class="btn primary" data-accept="${invite.id}">Accept</button>
        <button class="btn ghost" data-reject="${invite.id}">Reject</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-accept]").forEach((button) => {
    button.addEventListener("click", async () => {
      const invite = state.invites.find((item) => item.id === button.dataset.accept);
      await acceptProjectInvite(invite, state.user);
      await refresh();
    });
  });

  list.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", async () => {
      await rejectProjectInvite(button.dataset.reject);
      await refresh();
    });
  });
}

function bindEvents() {
  $("#projectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    showMessage("#projectMessage", "Creating project...");

    try {
      const projectId = await createProject(state.user, {
        name: $("#projectName").value,
        description: $("#projectDescription").value
      });

      $("#projectName").value = "";
      $("#projectDescription").value = "";
      showMessage("#projectMessage", "Project created.", "ok");
      await refresh();
      location.href = `./project.html?id=${encodeURIComponent(projectId)}`;
    } catch (error) {
      console.error(error);
      showMessage("#projectMessage", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
}

initAuthPage(async (user) => {
  state.user = user;
  bindEvents();
  await refresh();
});
