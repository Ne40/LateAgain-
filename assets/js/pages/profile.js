import { initAuthPage, $, showMessage, escapeHtml, fallbackAvatar } from "./shared.js";
import {
  getUserProfile,
  updateUserProfile
} from "../services/profile.service.js";
import { uploadProfilePicture } from "../services/cloudinary.service.js";

const state = {
  user: null,
  profile: null,
  goals: []
};

function render() {
  const profile = state.profile || {};
  const photo = profile.photoURL || fallbackAvatar(profile.email || state.user.email);

  $("#displayName").value = profile.displayName || "";
  $("#bio").value = profile.bio || "";
  $("#profileImagePreview").src = photo;
  $("#previewName").textContent = profile.displayName || "Your Name";
  $("#previewEmail").textContent = profile.email || state.user.email;
  $("#previewBio").textContent = profile.bio || "Write a bio to make your profile less mysterious.";

  $("#goalChips").innerHTML = state.goals.length
    ? state.goals.map((goal) => `<span class="chip">${escapeHtml(goal)}</span>`).join("")
    : `<span class="muted">No goals yet.</span>`;

  $("#goalsList").innerHTML = state.goals.length
    ? state.goals.map((goal, index) => `
      <article class="item-card">
        <strong>${escapeHtml(goal)}</strong>
        <div class="item-actions">
          <button class="btn ghost" data-goal-index="${index}">Remove</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty-state">Add monthly or life goals.</div>`;

  $("#goalsList").querySelectorAll("[data-goal-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.goals.splice(Number(button.dataset.goalIndex), 1);
      render();
    });
  });
}

function bindEvents() {
  $("#addGoalBtn").addEventListener("click", () => {
    const value = $("#goalInput").value.trim();
    if (!value) return;

    state.goals.push(value);
    $("#goalInput").value = "";
    render();
  });

  $("#profilePic").addEventListener("change", () => {
    const file = $("#profilePic").files[0];
    if (file) {
      $("#profileImagePreview").src = URL.createObjectURL(file);
    }
  });

  $("#profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("button[type='submit']");
    button.disabled = true;
    showMessage("#profileMessage", "Saving profile...");

    try {
      let photoURL = state.profile.photoURL || "";
      const file = $("#profilePic").files[0];

      if (file) {
        showMessage("#profileMessage", "Uploading profile picture...");
        photoURL = await uploadProfilePicture(file);
      }

      const data = {
        displayName: $("#displayName").value.trim(),
        bio: $("#bio").value.trim(),
        goals: state.goals,
        photoURL
      };

      await updateUserProfile(state.user.uid, data);

      state.profile = {
        ...state.profile,
        ...data
      };

      render();
      showMessage("#profileMessage", "Profile saved.", "ok");
    } catch (error) {
      console.error(error);
      showMessage("#profileMessage", error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
}

initAuthPage(async (user) => {
  state.user = user;
  state.profile = await getUserProfile(user.uid);
  state.goals = Array.isArray(state.profile?.goals) ? [...state.profile.goals] : [];
  bindEvents();
  render();
});
