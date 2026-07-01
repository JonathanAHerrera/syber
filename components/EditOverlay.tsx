"use client";

import { useState } from "react";
import { DEFAULT_CONTEXT, DEFAULT_PROJECT, isValidContext, isValidProject } from "@/lib/enums";
import type { Context, Project } from "@/lib/enums";
import type { Task } from "@/lib/queries";
import { updateTaskTags } from "@/lib/queries";
import { useSettings } from "@/components/SettingsProvider";

interface Props {
  task: Task;
  onClose: () => void;
}

export default function EditOverlay({ task, onClose }: Props) {
  const { contexts: validContexts, projects: validProjects } = useSettings();
  const [contextsText, setContextsText] = useState(task.contexts.join(", "));
  const [projectText, setProjectText] = useState<string>(task.project);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const parsed = contextsText
      .split(",")
      .map((s) => s.trim())
      .filter((c) => validContexts.includes(c) || isValidContext(c)) as Context[];

    const contexts: Context[] = parsed.length > 0 ? parsed : [DEFAULT_CONTEXT];

    const trimmedProject = projectText.trim();
    const project: Project = (validProjects.includes(trimmedProject) || isValidProject(trimmedProject))
      ? (trimmedProject as Project)
      : DEFAULT_PROJECT;

    await updateTaskTags(task.id, contexts, project);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg border border-gray-200">
        <h2 className="text-sm font-semibold text-black">Edit task</h2>
        <p className="text-xs text-gray-400 truncate">{task.text}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Contexts
            </label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-black transition"
              value={contextsText}
              onChange={(e) => setContextsText(e.target.value)}
              placeholder="@plane, @computer"
            />
            <p className="mt-1 text-xs text-gray-300">{validContexts.join(", ")}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Project
            </label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-black transition"
              value={projectText}
              onChange={(e) => setProjectText(e.target.value)}
              placeholder="personal"
            />
            <p className="mt-1 text-xs text-gray-300">{validProjects.join(", ")}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:border-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
