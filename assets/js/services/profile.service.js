import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase.js";

function defaultNameFromEmail(email = "") {
  return email.split("@")[0] || "LateAgain user";
}

export async function createUserProfileIfMissing(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: defaultNameFromEmail(user.email),
      bio: "",
      photoURL: "",
      goals: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function upsertUserStats(uid, monthId, stats) {
  await setDoc(doc(db, "users", uid, "stats", monthId), {
    ...stats,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getUserStats(uid, monthId) {
  const snap = await getDoc(doc(db, "users", uid, "stats", monthId));
  return snap.exists() ? snap.data() : {
    totalTasks: 0,
    completedTasks: 0,
    productivityScore: 0
  };
}
