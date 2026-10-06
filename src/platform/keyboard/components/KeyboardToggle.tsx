"use client";
import { useHostStore } from "@/platform/host/host-store";
import { setKeyboardRoom, useKeyboardUi } from "../keyboard-store";

/**
 * The admin panel's Keyboard player switch. Only a host with a room open
 * can seat one, so elsewhere it is not shown.
 */
export function KeyboardToggle() {
  const code = useHostStore((state) => state.room?.code ?? null);
  const on = useKeyboardUi((ui) => code !== null && ui.room === code);
  if (!code) return null;
  return (
    <button
      type="button"
      className={`admin__action ${on ? "admin__action--on" : ""}`}
      aria-pressed={on}
      onClick={() => setKeyboardRoom(on ? null : code)}
    >
      Keyboard player
    </button>
  );
}
