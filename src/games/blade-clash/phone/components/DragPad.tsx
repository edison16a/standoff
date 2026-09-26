"use client";
import { useEffect, useRef, type PointerEvent } from "react";
import { SwordGauge } from "./SwordGauge";
import { useController } from "./session-context";

/** The pad's edges reach this far past the view's edges, so a finger can raise the blade high or swing it wide. */
const REACH_PAST = 1.3;

/**
 * For phones without motion sensors: drag a finger to point the sword.
 * The pad is the player's view, so the tip goes where the finger is.
 * Lifting the finger rests the sword back in guard.
 */
export function DragPad({ colour }: { colour: string }) {
  const session = useController();
  const padRef = useRef<HTMLDivElement>(null);

  // Never leave the sword pinned somewhere when the pad goes away.
  useEffect(() => () => session.drag(null), [session]);

  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = padRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((event.clientX - box.left) / box.width) * 2 - 1;
    const y = 1 - ((event.clientY - box.top) / box.height) * 2;
    session.drag({ x: x * REACH_PAST, y: y * REACH_PAST });
  };

  return (
    <div
      ref={padRef}
      className="drag-pad"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        point(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) point(event);
      }}
      onPointerUp={() => session.drag(null)}
      onPointerCancel={() => session.drag(null)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <SwordGauge colour={colour} className="drag-pad__gauge" />
      <span className="drag-pad__hint">Drag to swing</span>
    </div>
  );
}
