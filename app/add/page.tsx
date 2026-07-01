"use client";

import { useState, useRef } from "react";
import { auth } from "@/lib/firebase";
import { addTask, updateTaskTags } from "@/lib/queries";
import { useSettings } from "@/components/SettingsProvider";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";
import type { Context, Project } from "@/lib/enums";

function AddScreen() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { contexts, projects } = useSettings();

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);

    const user = auth.currentUser;
    if (!user) return;

    const taskId = await addTask(user.uid, trimmed);
    setText("");
    setSubmitting(false);
    inputRef.current?.focus();

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ text: trimmed, contexts, projects }),
      });
      if (res.ok) {
        const { contexts: taggedContexts, project } = await res.json();
        await updateTaskTags(taskId, taggedContexts as Context[], project as Project);
      }
    } catch {
      // stays @anywhere — retag picks it up on next focus
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <textarea
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="What needs to get done?"
          className="w-full max-w-lg text-xl bg-transparent border-none outline-none resize-none text-black placeholder-gray-200 text-center min-h-[120px]"
          rows={4}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-800 transition"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

export default function AddPage() {
  return <AuthGate>{() => <AddScreen />}</AuthGate>;
}
