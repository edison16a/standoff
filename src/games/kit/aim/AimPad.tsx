"use client";
import "./aim.css";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { PadTracker } from "./pad-tracker";
import type { PhoneAim } from "./phone-aim";

/** A full swipe across the pad moves the aim this far across the big screen. */
const SENSITIVITY = 2.4;

/**
 * For phones without motion sensors: drag anywhere on this area to move
 * your aim, like a laptop trackpad. Children draw on top, so a game can
 * put its fire button inside the pad.
 */
export function AimPad({ aim, children }: { aim: PhoneAim; children?: ReactNode }) {
  const fingers = useRef(new PadTracker());
  const lift = (event: PointerEvent) => fingers.current.lift(event.pointerId);
  return (
    <div
      className="kit-pad"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        fingers.current.press(event.pointerId, event.clientX, event.clientY);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const moved = fingers.current.move(event.pointerId, event.clientX, event.clientY);
        if (!moved) return;
        const box = event.currentTarget.getBoundingClientRect();
        aim.nudge((moved.dx / box.width) * SENSITIVITY, (-moved.dy / box.height) * SENSITIVITY);
      }}
      onPointerUp={lift}
      onPointerCancel={lift}
      onLostPointerCapture={lift}
    >
      <span className="kit-pad__hint">Drag here to aim</span>
      {children}
    </div>
  );
}
