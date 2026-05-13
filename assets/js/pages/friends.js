import {
  initAuthPage,
  $,
  showMessage,
  formatMonthId,
  escapeHtml,
  fallbackAvatar,
  emptyState
} from "./shared.js";

import {
  sendFriendRequest,
  getIncomingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends
} from "../services/friends.service.js";

import {
  getUserProfile,
  getUserStats
} from "../services/profile.service.js";

const state = {
  user: null,
  monthId: formatMonthId(new Date()),
  requests: [],
  friends: []
};

async function refresh() {
  state.requests = await getIncomingFriendRequests(state.user.email);
  state.friends = await getFriends(state.user.uid);
  await render();
}

async function render() {
  $("#monthInput").value = state.monthId;
  renderRequests();
  await renderFriends();
}

function renderRequests() {
  const list = $("#requestsList");

  if (!state.requests.length) {
    list.innerHTML = emptyState("No incoming requests.");
    return;
  }

  list.innerHTML = state.requests.map((request) => `
    <article class="item-card">
      <strong>${escapeHtml(request.fromEmail)}</strong>
      <span class="muted">wants to be friends</span>
      <div class="item-actions">
        <button class="btn primary" data-accept="${request.id}">Accept</button>
        <button class="btn ghost" data-reject="${request.id}">Reject</button>
      </div>
    </article>
  `).join("");

  list.querySelectorAll("[data-accept]").forEach((button) => {
    button.addEventListener("click", async () => {
      const request = state.requests.find((item) => item.id === button.dataset.accept);
      await acceptFriendRequest(request, state.user);
      await refresh();
    });
  });

  list.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", async () => {
      await rejectFriendRequest(button.dataset.reject);
      await refresh();
    });
  });
}

async function renderFriends() {
  const grid = $("#friendsGrid");

  if (!state.friends.length) {
    grid.innerHTML = emptyState("No friends yet. Send a request above.");
    return;
  }

  const cards = await Promise.all(state.friends.map(async (friend) => {
    const profile = await getUserProfile(friend.friendUid);
    const stats = await getUserStats(friend.friendUid, state.monthId);
    const score = stats.productivityScore || 0;

    return `
      <article class="friend-card">
        <div class="friend-header">
          <img class="avatar" src="${profile?.photoURL || fallbackAvatar(friend.email)}" alt="">
          <div>
            <h3>${escapeHtml(profile?.displayName || friend.email)}</h3>
            <p class="muted tiny">${escapeHtml(friend.email)}</p>
          </div>
        </div>

        <p class="muted">${escapeHtml(profile?.bio || "No bio yet.")}</p>

        <div>
          <strong>${score}% productivity</strong>
          <div class="progress-bar"><span style="width:${score}%"></span></div>
          <p class="muted tiny">${stats.completedTasks || 0}/${stats.totalTasks || 0} tasks completed in ${state.monthId}</p>
        </div>

        <div class="goal-chips">
          ${(profile?.goals || []).slice(0, 5).map((goal) => `<span class="chip">${escapeHtml(goal)}</span>`).join("") || `<span class="muted">No goals visible.</span>`}
        </div>
      </article>
    `;
  }));

  grid.innerHTML = cards.join("");
}

function bindEvents() {
  $("#friendForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button");
    button.disabled = true;
    showMessage("#friendMessage", "Sending request...");

    try {
      await sendFriendRequest(state.user, $("#friendEmail").value);
      $("#friendEmail").value = "";
      showMessage("#friendMessage", "Request sent.", "ok");
    } catch (error) {
      console.error(error);
      showMessage("#friendMessage", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  $("#monthInput").addEventListener("change", async () => {
    state.monthId = $("#monthInput").value || formatMonthId(new Date());
    await renderFriends();
  });
}

initAuthPage(async (user) => {
  state.user = user;
  bindEvents();
  await refresh();
});
