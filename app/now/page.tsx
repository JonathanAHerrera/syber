"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { subscribeNowTasks, updateTaskContexts } from "@/lib/queries";
import type { Task } from "@/lib/queries";
import type { Context } from "@/lib/enums";
import { useSettings } from "@/components/SettingsProvider";
import TaskItem from "@/components/TaskItem";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";

function sortTasks(tasks: Task[], projects: string[]): Task[] {
  return [...tasks].sort((a, b) => {
    const pa = projects.indexOf(a.project);
    const pb = projects.indexOf(b.project);
    const oa = pa === -1 ? projects.length : pa;
    const ob = pb === -1 ? projects.length : pb;
    if (oa !== ob) return oa - ob;
    return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
  });
}

function NowScreen({ user }: { user: User }) {
  const { contexts, projects } = useSettings();
  const [selectedContext, setSelectedContext] = useState<string>("@anywhere");
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  useEffect(() => {
    return subscribeNowTasks(user.uid, setAllTasks);
  }, [user.uid]);

  useEffect(() => {
    if (selectedContext !== "@anywhere" && !contexts.includes(selectedContext)) {
      setSelectedContext("@anywhere");
    }
  }, [contexts, selectedContext]);

  const filtered = sortTasks(
    allTasks.filter(
      (t) => t.contexts.includes(selectedContext) || t.contexts.includes("@anywhere")
    ),
    projects
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <div className="flex gap-1.5 px-4 pt-4 overflow-x-auto pb-1">
        {contexts.map((ctx) => (
          <button
            key={ctx}
            data-tab={ctx}
            onClick={() => setSelectedContext(ctx)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition ${
              ctx === selectedContext
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            } ${dragOverTab === ctx ? "ring-2 ring-black ring-offset-1" : ""}`}
          >
            {ctx}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300 text-sm">
            Nothing to do in {selectedContext}
          </div>
        ) : (
          filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onDropTag={(t, ctx) => updateTaskContexts(t.id, [ctx as Context])}
              onDragHover={setDragOverTab}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function NowPage() {
  return <AuthGate>{(user) => <NowScreen user={user} />}</AuthGate>;
}
