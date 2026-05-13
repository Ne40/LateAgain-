import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase.js";

export async function sendFriendRequest(currentUser, toEmail) {
  const cleanEmail = toEmail.trim().toLowerCase();

  if (!cleanEmail) throw new Error("Friend email is required.");
  if (cleanEmail === currentUser.email.toLowerCase()) {
    throw new Error("You cannot add yourself.");
  }

  await addDoc(collection(db, "friendRequests"), {
    fromUid: currentUser.uid,
    fromEmail: currentUser.email,
    toEmail: cleanEmail,
    status: "pending",
    createdAt: serverTimestamp()
  });
}

export async function getIncomingFriendRequests(userEmail) {
  const q = query(
    collection(db, "friendRequests"),
    where("toEmail", "==", userEmail.toLowerCase()),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function getOutgoingFriendRequests(uid) {
  const q = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", uid),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function acceptFriendRequest(request, currentUser) {
  await updateDoc(doc(db, "friendRequests", request.id), {
    status: "accepted",
    acceptedAt: serverTimestamp()
  });

  await setDoc(doc(db, "users", currentUser.uid, "friends", request.fromUid), {
    friendUid: request.fromUid,
    email: request.fromEmail,
    requestId: request.id,
    since: serverTimestamp()
  });

  await setDoc(doc(db, "users", request.fromUid, "friends", currentUser.uid), {
    friendUid: currentUser.uid,
    email: currentUser.email,
    requestId: request.id,
    since: serverTimestamp()
  });
}

export async function rejectFriendRequest(requestId) {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "rejected",
    rejectedAt: serverTimestamp()
  });
}

export async function getFriends(uid) {
  const snap = await getDocs(collection(db, "users", uid, "friends"));
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}
