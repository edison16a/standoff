"use client";
import "./aim.css";
import { useRef, type ReactNode } from "react";
import type { PhoneAim } from "./phone-aim";

/** A full swipe across the pad moves the aim this far across the big screen. */
const SENSITIVITY = 2.4;

/**
 * For phones without motion sensors: drag anywhere on this area to move
 * your aim, like a laptop trackpad. Children draw on top, so a game can
 * put its fire button inside the pad.
 */
export function AimPad({ aim, children }: { aim: PhoneAim; children?: ReactNode }) {
  const last = useRef<{ id: number; x: number; y: number } | null>(null);
  return (
    <div
      className="kit-pad"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        last.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const from = last.current;
        if (!from || from.id !== event.pointerId) return;
        const box = event.currentTarget.getBoundingClientRect();
        aim.nudge(((event.clientX - from.x) / box.width) * SENSITIVITY, (-(event.clientY - from.y) / box.height) * SENSITIVITY);
        last.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => (last.current = null)}
      onPointerCancel={() => (last.current = null)}
    >
      <span className="kit-pad__hint">Drag here to aim</span>
      {children}
    </div>
  );
}
