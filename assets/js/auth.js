import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { auth } from "./firebase.js";
import { createUserProfileIfMissing } from "./services/profile.service.js";

const $ = (selector) => document.querySelector(selector);
const authMessage = $("#authMessage");

function setMessage(text, type = "") {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.className = `message ${type}`;
}

function friendlyAuthError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "This email already has an account.",
    "auth/invalid-email": "Invalid email.",
    "auth/operation-not-allowed": "Email/Password is not enabled in Firebase Authentication.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Wrong password.",
    "auth/invalid-credential": "Wrong email or password.",
    "auth/unauthorized-domain": "Add localhost / 127.0.0.1 to Firebase authorized domains."
  };

  return map[code] || error.message || "Authentication failed.";
}

const loginForm = $("#loginForm");
const registerForm = $("#registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button");
    button.disabled = true;
    setMessage("Logging in...");

    try {
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await createUserProfileIfMissing(credential.user);
      location.href = "./dashboard.html";
    } catch (error) {
      console.error(error);
      setMessage(friendlyAuthError(error), "error");
    } finally {
      button.disabled = false;
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = registerForm.querySelector("button");
    button.disabled = true;
    setMessage("Creating your account...");

    try {
      const email = $("#email").value.trim();
      const password = $("#password").value;
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfileIfMissing(credential.user);
      location.href = "./dashboard.html";
    } catch (error) {
      console.error(error);
      setMessage(friendlyAuthError(error), "error");
    } finally {
      button.disabled = false;
    }
  });
}

onAuthStateChanged(auth, (user) => {
  const isAuthPage = location.pathname.endsWith("index.html")
    || location.pathname.endsWith("register.html")
    || location.pathname === "/"
    || location.pathname.endsWith("/LateAgain_full_upgrade/");

  if (user && isAuthPage && !registerForm && !loginForm) {
    location.href = "./dashboard.html";
  }
});
