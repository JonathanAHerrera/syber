"use client";

// T5: Re-tag trigger guarded against double-fire (visibilitychange + focus)
import { subscribeUntaggedTasks, updateTaskTags } from "./queries";
import type { Context, Project } from "./enums";

let inFlight = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

interface RetagOptions {
  contexts: string[];
  projects: string[];
}

async function tagUntagged(uid: string, idToken: string, opts: RetagOptions) {
  if (inFlight) return;
  inFlight = true;
  try {
    await new Promise<void>((resolve) => {
      const unsub = subscribeUntaggedTasks(uid, async (tasks) => {
        unsub();
        await Promise.allSettled(
          tasks.map(async (task) => {
            try {
              const res = await fetch("/api/tag", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ text: task.text, ...opts }),
              });
              if (res.ok) {
                const { contexts, project } = await res.json();
                await updateTaskTags(task.id, contexts as Context[], project as Project);
              }
            } catch {
              // silently skip — stays @anywhere, retried on next trigger
            }
          })
        );
        resolve();
      });
    });
  } finally {
    inFlight = false;
  }
}

function scheduleRetag(uid: string, getToken: () => Promise<string>, getOpts: () => RetagOptions) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const [token] = await Promise.all([getToken()]);
    await tagUntagged(uid, token, getOpts());
  }, 300);
}

export function registerRetagListeners(
  uid: string,
  getToken: () => Promise<string>,
  getOpts: () => RetagOptions = () => ({ contexts: [], projects: [] })
) {
  const handler = () => {
    if (document.visibilityState === "visible") scheduleRetag(uid, getToken, getOpts);
  };
  const focusHandler = () => scheduleRetag(uid, getToken, getOpts);

  document.addEventListener("visibilitychange", handler);
  window.addEventListener("focus", focusHandler);

  scheduleRetag(uid, getToken, getOpts);

  return () => {
    document.removeEventListener("visibilitychange", handler);
    window.removeEventListener("focus", focusHandler);
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}
