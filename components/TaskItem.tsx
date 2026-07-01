"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/queries";
import { markDone } from "@/lib/queries";
import EditOverlay from "./EditOverlay";

const LONG_PRESS_MS = 500;

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

  const rootRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pressActiveRef = useRef(false);

  // On mobile, preventDefault() on POINTER events does nothing to stop the
  // page from scrolling — only touch-action CSS or a NON-passive touchmove
  // listener can. React attaches touchmove passively, so we bind our own.
  // Once the long-press has armed (finger held still, no scroll started yet),
  // we block the scroll so the browser hands the gesture to us instead of
  // firing pointercancel and killing the drag.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (armedRef.current || draggingRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // Armed = long-press held long enough to pick the task up. Only becomes a
  // drag if the pointer then moves; otherwise it's the existing edit gesture.
  function startPress() {
    timerRef.current = setTimeout(() => {
      armedRef.current = true;
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current);
    armedRef.current = false;
  }

  function tabUnderPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    return el?.closest<HTMLElement>("[data-tab]")?.dataset.tab ?? null;
  }

  function handlePointerDown(e: React.PointerEvent) {
    startRef.current = { x: e.clientX, y: e.clientY };
    pressActiveRef.current = true;
    // Capture immediately (not once a drag is recognized) so tracking
    // survives the pointer leaving this element's bounds on the way to a
    // tab strip elsewhere on the page.
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore — capture is a best-effort affordance
    }
    startPress();
  }

  function handlePointerMove(e: React.PointerEvent) {
    // pointermove also fires on plain hover (no button held) — ignore
    // unless we're in an actual press-and-hold gesture.
    if (!pressActiveRef.current) return;

    if (draggingRef.current) {
      e.preventDefault();
      setGhostPos({ x: e.clientX, y: e.clientY });
      onDragHover?.(tabUnderPoint(e.clientX, e.clientY));
      return;
    }

    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    const moved = Math.hypot(dx, dy) > 10;
    // Mouse users drag immediately on move — no need to wait out the long
    // press. Touch waits for the hold (armedRef) so a quick swipe still
    // scrolls the list instead of triggering a drag.
    const canActivate = e.pointerType === "mouse" || armedRef.current;

    if (onDropTag && moved && canActivate) {
      e.preventDefault();
      draggingRef.current = true;
      setDragging(true);
      setGhostPos({ x: e.clientX, y: e.clientY });
      return;
    }
    // Moved before the press armed — this is a scroll/swipe, not a hold.
    if (moved) cancelPress();
  }

  function handlePointerUp(e: React.PointerEvent) {
    pressActiveRef.current = false;
    if (draggingRef.current) {
      const tab = tabUnderPoint(e.clientX, e.clientY);
      if (tab) onDropTag?.(task, tab);
      onDragHover?.(null);
      draggingRef.current = false;
      setDragging(false);
      suppressClickRef.current = true;
    } else if (armedRef.current) {
      setEditing(true);
      suppressClickRef.current = true;
    }
    cancelPress();
  }

  function handlePointerCancel() {
    // Browser aborted the gesture (e.g. a system gesture took over) — reset
    // fully so a later hover doesn't get misread as an in-progress press.
    pressActiveRef.current = false;
    draggingRef.current = false;
    setDragging(false);
    onDragHover?.(null);
    cancelPress();
  }

  async function handleTap() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    await markDone(task.id);
  }

  return (
    <>
      <div
        ref={rootRef}
        className={`flex items-start gap-3 py-3 px-4 bg-white rounded-lg border border-gray-100 select-none cursor-pointer hover:border-gray-300 transition ${
          dragging ? "opacity-40 touch-none" : ""
        }`}
        style={{ WebkitTouchCallout: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        onClick={handleTap}
      >
        <div className="mt-0.5 w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
        <div className="flex-1 min-w-0">
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
