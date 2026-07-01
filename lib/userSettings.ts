"use client";

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { CONTEXTS, PROJECTS } from "./enums";
import type { Context, Project } from "./enums";

export interface UserSettings {
  contexts: string[];
  projects: string[];
}

const DEFAULT_SETTINGS: UserSettings = {
  contexts: [...CONTEXTS],
  projects: [...PROJECTS],
};

function settingsRef(uid: string) {
  return doc(db, "userSettings", uid);
}

export function subscribeUserSettings(uid: string, cb: (s: UserSettings) => void) {
  return onSnapshot(settingsRef(uid), async (snap) => {
    if (!snap.exists()) {
      await setDoc(settingsRef(uid), DEFAULT_SETTINGS);
      cb(DEFAULT_SETTINGS);
    } else {
      cb(snap.data() as UserSettings);
    }
  });
}

export async function addContext(uid: string, ctx: string) {
  const snap = await getDoc(settingsRef(uid));
  const settings = snap.exists() ? (snap.data() as UserSettings) : DEFAULT_SETTINGS;
  if (settings.contexts.includes(ctx)) return;
  await setDoc(settingsRef(uid), { ...settings, contexts: [...settings.contexts, ctx] });
}

export async function removeContext(uid: string, ctx: string) {
  const snap = await getDoc(settingsRef(uid));
  const settings = snap.exists() ? (snap.data() as UserSettings) : DEFAULT_SETTINGS;
  const updated = settings.contexts.filter((c) => c !== ctx);
  await setDoc(settingsRef(uid), { ...settings, contexts: updated });

  // Migrate tasks that had this context — remove it, fall back to @anywhere if empty
  const taskSnap = await getDocs(
    query(collection(db, "tasks"), where("uid", "==", uid), where("contexts", "array-contains", ctx))
  );
  if (taskSnap.empty) return;
  const batch = writeBatch(db);
  taskSnap.docs.forEach((d) => {
    const remaining = (d.data().contexts as string[]).filter((c) => c !== ctx);
    batch.update(d.ref, { contexts: remaining.length > 0 ? remaining : ["@anywhere"] });
  });
  await batch.commit();
}

export async function addProject(uid: string, proj: string) {
  const snap = await getDoc(settingsRef(uid));
  const settings = snap.exists() ? (snap.data() as UserSettings) : DEFAULT_SETTINGS;
  if (settings.projects.includes(proj)) return;
  await setDoc(settingsRef(uid), { ...settings, projects: [...settings.projects, proj] });
}

export async function removeProject(uid: string, proj: string) {
  const snap = await getDoc(settingsRef(uid));
  const settings = snap.exists() ? (snap.data() as UserSettings) : DEFAULT_SETTINGS;
  const updated = settings.projects.filter((p) => p !== proj);
  await setDoc(settingsRef(uid), { ...settings, projects: updated });

  // Migrate tasks in that project → other
  const taskSnap = await getDocs(
    query(collection(db, "tasks"), where("uid", "==", uid), where("project", "==", proj))
  );
  if (taskSnap.empty) return;
  const batch = writeBatch(db);
  taskSnap.docs.forEach((d) => batch.update(d.ref, { project: "other" }));
  await batch.commit();
}
