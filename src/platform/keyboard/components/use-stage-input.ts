"use client";
import { useEffect } from "react";
import { isSystemKey, isTypingTarget } from "../key-state";
import type { KeyboardSeat } from "../keyboard-seat";
import { toStagePoint } from "../mouse-aim";
import type { StagePointer } from "../types";

/** Clicks on these are the page's own, never a shot at the stage. */
const NOT_STAGE = "button, a, input, select, textarea, label, [role='button'], .settings, [data-keyboard-skip]";

/**
 * Feeds the host page's keys and its mouse over the big screen to the
 * keyboard seat. Escape is the card's. A lost focus lets go of every key,
 * unless the focus only moved into the phone panel, which passes its keys
 * up the same way.
 */
export function useStageInput(seat: KeyboardSeat | null, toggleCard: () => void): void {
  useEffect(() => {
    if (!seat) return;
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.code === "Escape") {
        if (event.type === "keydown" && !event.repeat) toggleCard();
        return;
      }
      if (isSystemKey(event)) return;
      const used = seat.key({ code: event.code, down: event.type === "keydown", repeat: event.repeat });
      if (used) event.preventDefault();
    };
    const onPointer = (event: PointerEvent) => {
      const type: StagePointer["type"] = event.type === "pointermove" ? "move" : event.type === "pointerdown" ? "down" : "up";
      // A button let go anywhere still ends its press.
      const target = event.target as Element | null;
      if (type !== "up" && target?.closest?.(NOT_STAGE)) return;
      const point = toStagePoint(event.clientX, event.clientY, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
      seat.pointer({ type, ...point, button: type === "move" ? 0 : event.button });
    };
    const onBlur = () => setTimeout(() => !document.hasFocus() && seat.release(), 0);
    const onHidden = () => document.hidden && seat.release();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onPointer);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointer);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [seat, toggleCard]);
}
