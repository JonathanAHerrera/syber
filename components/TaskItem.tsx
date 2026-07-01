"use client";

import { useRef, useState } from "react";
import type { Task } from "@/lib/queries";
import { markDone } from "@/lib/queries";
import EditOverlay from "./EditOverlay";

const MOVE_THRESHOLD = 8;

interface Props {
  task: Task;
  // Called when the task is dropped on an element with a matching data-tab attribute.
  onDropTag?: (task: Task, tabValue: string) => void;
  // Called with the tab value currently under the pointer while dragging (or null).
  onDragHover?: (tabValue: string | null) => void;
}

export default function TaskItem({ task, onDropTag, onDragHover }: Props) {
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  const startRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const pressActiveRef = useRef(false);

  function tabUnderPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    return el?.closest<HTMLElement>("[data-tab]")?.dataset.tab ?? null;
  }

  // Drag is initiated only from the grip handle, which has touch-action:none
  // so a touch drag off it never scrolls the list — no long-press needed, and
  // it behaves identically for mouse and touch.
  function handleGripDown(e: React.PointerEvent) {
    if (!onDropTag) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    pressActiveRef.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore — capture is a best-effort affordance
    }
  }

  function handleGripMove(e: React.PointerEvent) {
    if (!pressActiveRef.current) return;

    if (draggingRef.current) {
      e.preventDefault();
      setGhostPos({ x: e.clientX, y: e.clientY });
      onDragHover?.(tabUnderPoint(e.clientX, e.clientY));
      return;
    }

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_THRESHOLD) {
      draggingRef.current = true;
      setDragging(true);
      setGhostPos({ x: e.clientX, y: e.clientY });
    }
  }

  function handleGripUp(e: React.PointerEvent) {
    if (!pressActiveRef.current) return;
    pressActiveRef.current = false;
    if (draggingRef.current) {
      const tab = tabUnderPoint(e.clientX, e.clientY);
      if (tab) onDropTag?.(task, tab);
      onDragHover?.(null);
      draggingRef.current = false;
      setDragging(false);
    }
  }

  function handleGripCancel() {
    pressActiveRef.current = false;
    draggingRef.current = false;
    setDragging(false);
    onDragHover?.(null);
  }

  async function handleDone(e: React.MouseEvent) {
    e.stopPropagation();
    await markDone(task.id);
  }

  return (
    <>
      <div
        className={`flex items-start gap-3 py-3 px-3 bg-white rounded-lg border border-gray-100 select-none hover:border-gray-300 transition ${
          dragging ? "opacity-40" : ""
        }`}
      >
        <button
          onClick={handleDone}
          aria-label="Mark done"
          className="mt-0.5 w-5 h-5 rounded-full border border-gray-300 flex-shrink-0 hover:border-black hover:bg-gray-50 active:bg-gray-100 transition"
        />
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setEditing(true)}
        >
          <p className="text-sm text-black leading-snug">{task.text}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {task.contexts.map((c) => (
              <span key={c} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                {c}
              </span>
            ))}
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {task.project}
            </span>
            {!task.tagged && (
              <span className="text-xs text-gray-300 animate-pulse">tagging…</span>
            )}
          </div>
        </div>
        {onDropTag && (
          <div
            aria-label="Drag to retag"
            className="flex-shrink-0 self-stretch flex items-center px-1 touch-none cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition"
            style={{ WebkitTouchCallout: "none" }}
            onPointerDown={handleGripDown}
            onPointerMove={handleGripMove}
            onPointerUp={handleGripUp}
            onPointerCancel={handleGripCancel}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5.5" cy="3" r="1.4" />
              <circle cx="10.5" cy="3" r="1.4" />
              <circle cx="5.5" cy="8" r="1.4" />
              <circle cx="10.5" cy="8" r="1.4" />
              <circle cx="5.5" cy="13" r="1.4" />
              <circle cx="10.5" cy="13" r="1.4" />
            </svg>
          </div>
        )}
      </div>
      {dragging && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 bg-black text-white text-xs rounded-md shadow-lg max-w-[70vw] truncate"
          style={{ left: ghostPos.x, top: ghostPos.y, transform: "translate(-50%, -50%)" }}
        >
          {task.text}
        </div>
      )}
      {editing && <EditOverlay task={task} onClose={() => setEditing(false)} />}
    </>
  );
}
