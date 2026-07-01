"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import {
  subscribeUserSettings,
  addContext,
  removeContext,
  addProject,
  removeProject,
  type UserSettings,
} from "@/lib/userSettings";
import { CONTEXTS, PROJECTS } from "@/lib/enums";

const PINNED_CONTEXT = "@anywhere";
const PINNED_PROJECT = "other";

function sortWithPinnedLast(arr: string[], pinned: string): string[] {
  return [...arr.filter((v) => v !== pinned), ...(arr.includes(pinned) ? [pinned] : [])];
}

interface SettingsCtx extends UserSettings {
  loading: boolean;
  addContext: (ctx: string) => Promise<void>;
  removeContext: (ctx: string) => Promise<void>;
  addProject: (proj: string) => Promise<void>;
  removeProject: (proj: string) => Promise<void>;
}

const Ctx = createContext<SettingsCtx>({
  contexts: [...CONTEXTS],
  projects: [...PROJECTS],
  loading: true,
  addContext: async () => {},
  removeContext: async () => {},
  addProject: async () => {},
  removeProject: async () => {},
});

export function useSettings() {
  return useContext(Ctx);
}

export default function SettingsProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>({ contexts: [...CONTEXTS], projects: [...PROJECTS] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeUserSettings(user.uid, (s) => {
      setSettings({
        contexts: sortWithPinnedLast(s.contexts, PINNED_CONTEXT),
        projects: sortWithPinnedLast(s.projects, PINNED_PROJECT),
      });
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  return (
    <Ctx.Provider
      value={{
        ...settings,
        loading,
        addContext: (ctx) => addContext(user.uid, ctx),
        removeContext: (ctx) => removeContext(user.uid, ctx),
        addProject: (proj) => addProject(user.uid, proj),
        removeProject: (proj) => removeProject(user.uid, proj),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
