"use client";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";
import { useSettings } from "@/components/SettingsProvider";

const PERMANENT_CONTEXTS = ["@anywhere"];
const PERMANENT_PROJECTS = ["other"];

function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm bg-gray-100 text-black border border-gray-200">
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 text-gray-300 hover:text-black transition leading-none"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

function AddInput({
  placeholder,
  onAdd,
  normalize,
}: {
  placeholder: string;
  onAdd: (val: string) => Promise<void>;
  normalize?: (val: string) => string;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const v = normalize ? normalize(value.trim()) : value.trim();
    if (!v) return;
    setSaving(true);
    await onAdd(v);
    setValue("");
    setSaving(false);
  }

  return (
    <div className="flex gap-2 mt-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder={placeholder}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-black placeholder-gray-300 focus:outline-none focus:border-black transition"
      />
      <button
        onClick={handleAdd}
        disabled={!value.trim() || saving}
        className="px-4 py-2 bg-black text-white text-sm rounded-lg disabled:opacity-30 hover:bg-gray-800 transition"
      >
        Add
      </button>
    </div>
  );
}

function SettingsScreen() {
  const { contexts, projects, addContext, removeContext, addProject, removeProject, loading } =
    useSettings();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function normalizeContext(val: string) {
    return val.startsWith("@") ? val : `@${val}`;
  }

  return (
    <div className="flex-1 p-4 space-y-8 max-w-lg mx-auto w-full">
      <section>
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
          Contexts
        </h2>
        <div className="flex flex-wrap gap-2">
          {contexts.map((ctx) => (
            <TagChip
              key={ctx}
              label={ctx}
              onRemove={PERMANENT_CONTEXTS.includes(ctx) ? undefined : () => removeContext(ctx)}
            />
          ))}
        </div>
        <AddInput placeholder="@errands" onAdd={addContext} normalize={normalizeContext} />
      </section>

      <section>
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
          Projects
        </h2>
        <div className="flex flex-wrap gap-2">
          {projects.map((proj) => (
            <TagChip
              key={proj}
              label={proj}
              onRemove={PERMANENT_PROJECTS.includes(proj) ? undefined : () => removeProject(proj)}
            />
          ))}
        </div>
        <AddInput placeholder="side-project" onAdd={addProject} />
      </section>

      <section className="pt-4 border-t border-gray-100">
        <button
          onClick={() => signOut(auth)}
          className="text-sm text-gray-400 hover:text-black transition"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGate>
      {() => (
        <div className="min-h-screen bg-white flex flex-col relative">
          <Nav />
          <SettingsScreen />
          <span className="fixed bottom-4 right-4 text-4xl select-none pointer-events-none">🐸</span>
        </div>
      )}
    </AuthGate>
  );
}
