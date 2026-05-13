import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase.js";

export async function createProject(user, projectData) {
  const projectRef = doc(collection(db, "projects"));
  const batch = writeBatch(db);

  batch.set(projectRef, {
    name: projectData.name.trim(),
    description: projectData.description || "",
    ownerId: user.uid,
    createdAt: serverTimestamp()
  });

  batch.set(doc(db, "projects", projectRef.id, "members", user.uid), {
    uid: user.uid,
    email: user.email,
    role: "owner",
    joinedAt: serverTimestamp()
  });

  batch.set(doc(db, "users", user.uid, "projects", projectRef.id), {
    projectId: projectRef.id,
    name: projectData.name.trim(),
    role: "owner",
    joinedAt: serverTimestamp()
  });

  await batch.commit();
  return projectRef.id;
}

export async function getMyProjects(uid) {
  const snap = await getDocs(collection(db, "users", uid, "projects"));
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function getProject(projectId) {
  const snap = await getDoc(doc(db, "projects", projectId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function listenProject(projectId, callback) {
  return onSnapshot(doc(db, "projects", projectId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export function listenProjectMembers(projectId, callback) {
  return onSnapshot(collection(db, "projects", projectId, "members"), (snap) => {
    const members = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(members);
  });
}

export async function inviteUserToProject(projectId, projectName, currentUser, email, role = "member") {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error("Email is required.");

  await addDoc(collection(db, "projectInvites"), {
    projectId,
    projectName,
    fromUid: currentUser.uid,
    fromEmail: currentUser.email,
    toEmail: cleanEmail,
    role,
    status: "pending",
    createdAt: serverTimestamp()
  });
}

export async function getMyProjectInvites(email) {
  const q = query(
    collection(db, "projectInvites"),
    where("toEmail", "==", email.toLowerCase()),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function acceptProjectInvite(invite, currentUser) {
  const batch = writeBatch(db);

  batch.update(doc(db, "projectInvites", invite.id), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    acceptedBy: currentUser.uid
  });

  batch.set(doc(db, "projects", invite.projectId, "members", currentUser.uid), {
    uid: currentUser.uid,
    email: currentUser.email,
    role: invite.role || "member",
    inviteId: invite.id,
    joinedAt: serverTimestamp()
  });

  batch.set(doc(db, "users", currentUser.uid, "projects", invite.projectId), {
    projectId: invite.projectId,
    name: invite.projectName,
    role: invite.role || "member",
    inviteId: invite.id,
    joinedAt: serverTimestamp()
  });

  await batch.commit();
}

export async function rejectProjectInvite(inviteId) {
  await updateDoc(doc(db, "projectInvites", inviteId), {
    status: "rejected",
    rejectedAt: serverTimestamp()
  });
}

export async function addProjectTask(projectId, user, task) {
  await addDoc(collection(db, "projects", projectId, "tasks"), {
    title: task.title.trim(),
    description: task.description || "",
    assignedTo: task.assignedTo,
    assignedToEmail: task.assignedToEmail,
    createdBy: user.uid,
    createdByEmail: user.email,
    status: "todo",
    dueDate: task.dueDate,
    startTime: task.startTime,
    endTime: task.endTime,
    quadrant: task.quadrant,
    createdAt: serverTimestamp()
  });
}

export function listenProjectTasks(projectId, callback) {
  const q = query(
    collection(db, "projects", projectId, "tasks"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    callback(tasks);
  });
}

export async function updateProjectTaskStatus(projectId, taskId, status) {
  await updateDoc(doc(db, "projects", projectId, "tasks", taskId), {
    status,
    updatedAt: serverTimestamp()
  });
}
