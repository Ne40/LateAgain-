import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase.js";

export async function sendProjectMessage(projectId, user, text) {
  const cleanText = text.trim();
  if (!cleanText) return;

  await addDoc(collection(db, "projects", projectId, "messages"), {
    senderId: user.uid,
    senderEmail: user.email,
    text: cleanText,
    createdAt: serverTimestamp()
  });
}

export function listenProjectMessages(projectId, callback) {
  const q = query(
    collection(db, "projects", projectId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    callback(messages);
  });
}
