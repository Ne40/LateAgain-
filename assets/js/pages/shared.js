import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth } from "../firebase.js";
import { createUserProfileIfMissing } from "../services/profile.service.js";

export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let appShown = false;

export function showApp() {
  if (appShown) return;
  appShown = true;

  const loader = $("#loadingScreen");
  if (loader) {
    setTimeout(() => loader.classList.add("hidden"), 200);
  }
}

export function showMessage(selector, text, type = "") {
  const el = $(selector);
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
}

export function formatMonthId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDateId(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function monthLabel(date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(date);
}

export function quadrantLabel(value) {
  const labels = {
    "urgent-important": "Urgent + Important",
    "urgent-not-important": "Urgent + Not important",
    "not-urgent-important": "Not urgent + Important",
    "not-urgent-not-important": "Not urgent + Not important"
  };

  return labels[value] || value;
}

export function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function fallbackAvatar(email = "") {
  const initial = (email[0] || "?").toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <rect width="220" height="220" fill="#272929"/>
      <rect x="12" y="12" width="196" height="196" fill="#31302E" stroke="#D5BF98" stroke-width="4"/>
      <text x="110" y="132" font-size="80" text-anchor="middle" fill="#D5BF98" font-family="monospace">${initial}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function initAuthPage(callback) {
  const timeout = setTimeout(showApp, 1800);

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      location.href = "./index.html";
      return;
    }

    try {
      await createUserProfileIfMissing(user);
    } catch (error) {
      console.error("Profile bootstrap failed:", error);
    }

    const userEmail = $("#userEmail");
    if (userEmail) userEmail.textContent = user.email;

    const logoutBtn = $("#logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        location.href = "./index.html";
      }, { once: true });
    }

    clearTimeout(timeout);
    await callback(user);
    showApp();
  });
}

export function drawBarChart(canvas, bars, options = {}) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 28;
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#272929";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#B4B299";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  if (!bars.length) {
    ctx.fillStyle = "#797366";
    ctx.font = "16px monospace";
    ctx.fillText("No data yet", padding, height / 2);
    return;
  }

  const usableWidth = width - padding * 2;
  const barWidth = Math.max(12, usableWidth / bars.length - 8);

  bars.forEach((bar, index) => {
    const x = padding + index * (usableWidth / bars.length);
    const barHeight = ((height - padding * 2) * bar.value) / max;
    const y = height - padding - barHeight;

    ctx.fillStyle = options.fill || "#D5BF98";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#D8B898";
    ctx.font = "11px monospace";
    ctx.fillText(bar.label, x, height - 8);
  });
}
