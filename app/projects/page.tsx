"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { subscribeProjectTasks, updateTaskProject } from "@/lib/queries";
import type { Task } from "@/lib/queries";
import type { Project } from "@/lib/enums";
import { useSettings } from "@/components/SettingsProvider";
import TaskItem from "@/components/TaskItem";
import AuthGate from "@/components/AuthGate";
import Nav from "@/components/Nav";

function ProjectTab({
  user,
  project,
  onDragHover,
}: {
  user: User;
  project: string;
  onDragHover: (tabValue: string | null) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    return subscribeProjectTasks(user.uid, project as never, (t) =>
      setTasks([...t].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)))
    );
  }, [user.uid, project]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-300 text-sm">
        No open tasks in {project}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tasks.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          onDropTag={(task, proj) => updateTaskProject(task.id, proj as Project)}
          onDragHover={onDragHover}
        />
      ))}
    </div>
  );
}

function ProjectsScreen({ user }: { user: User }) {
  const { projects } = useSettings();
  const [activeProject, setActiveProject] = useState<string>(projects[0] ?? "other");
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  useEffect(() => {
    if (!projects.includes(activeProject)) {
      setActiveProject(projects[0] ?? "other");
    }
  }, [projects, activeProject]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Nav />
      <div className="flex gap-1.5 px-4 pt-4 overflow-x-auto pb-1">
        {projects.map((p) => (
          <button
            key={p}
            data-tab={p}
            onClick={() => setActiveProject(p)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium capitalize transition ${
              p === activeProject
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            } ${dragOverTab === p ? "ring-2 ring-black ring-offset-1" : ""}`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex-1 p-4">
        <ProjectTab user={user} project={activeProject} onDragHover={setDragOverTab} />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return <AuthGate>{(user) => <ProjectsScreen user={user} />}</AuthGate>;
}
