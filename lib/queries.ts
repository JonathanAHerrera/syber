"use client";

// T3: ALL queries filter by uid — Firestore security rules deny reads without it
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Context, Project } from "./enums";

export interface Task {
  id: string;
  text: string;
  contexts: string[];
  project: string;
  done: boolean;
  tagged: boolean;
  createdAt: Date | null;
  uid: string;
}

function docToTask(d: DocumentData & { id: string }): Task {
  const data = d.data();
  return {
    id: d.id,
    text: data.text,
    contexts: data.contexts ?? ["@anywhere"],
    project: data.project ?? "other",
    done: data.done ?? false,
    tagged: data.tagged ?? false,
    createdAt: data.createdAt?.toDate() ?? null,
    uid: data.uid,
  };
}

// T3: uid filter is mandatory on every query
export function subscribeNowTasks(uid: string, cb: (tasks: Task[]) => void) {
  const q = query(
    collection(db, "tasks"),
    where("uid", "==", uid),
    where("done", "==", false)
  );
  return onSnapshot(q, (snap: QuerySnapshot) =>
    cb(snap.docs.map((d) => docToTask(d as unknown as DocumentData & { id: string })))
  );
}

export function subscribeProjectTasks(uid: string, project: Project | string, cb: (tasks: Task[]) => void) {
  const q = query(
    collection(db, "tasks"),
    where("uid", "==", uid),
    where("project", "==", project),
    where("done", "==", false)
  );
  return onSnapshot(q, (snap: QuerySnapshot) =>
    cb(snap.docs.map((d) => docToTask(d as unknown as DocumentData & { id: string })))
  );
}

export function subscribeUntaggedTasks(uid: string, cb: (tasks: Task[]) => void) {
  const q = query(
    collection(db, "tasks"),
    where("uid", "==", uid),
    where("tagged", "==", false),
    where("done", "==", false)
  );
  return onSnapshot(q, (snap: QuerySnapshot) =>
    cb(snap.docs.map((d) => docToTask(d as unknown as DocumentData & { id: string })))
  );
}

export async function addTask(uid: string, text: string): Promise<string> {
  const ref = await addDoc(collection(db, "tasks"), {
    uid,
    text,
    contexts: ["@anywhere"],
    project: "other",
    done: false,
    tagged: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function markDone(taskId: string) {
  await updateDoc(doc(db, "tasks", taskId), { done: true });
}

export async function updateTaskTags(taskId: string, contexts: Context[], project: Project) {
  await updateDoc(doc(db, "tasks", taskId), { contexts, project, tagged: true });
}

export async function updateTaskProject(taskId: string, project: Project) {
  await updateDoc(doc(db, "tasks", taskId), { project, tagged: true });
}

export async function updateTaskContexts(taskId: string, contexts: Context[]) {
  await updateDoc(doc(db, "tasks", taskId), { contexts, tagged: true });
}
