"use client";
import { useBoxingStore } from "../host-store";

const INPUTS = [
  { input: "camera", label: "Camera" },
  { input: "keys", label: "Keyboard" },
] as const;

/**
 * How player 1 boxes: in front of the camera, or keyboard mode for
 * testing without one. The admin panel's Keyboard player turns keyboard
 * mode on by itself.
 */
export function InputToggle() {
  const input = useBoxingStore((state) => state.input);
  return (
    <div className="bx-input" role="group" aria-label="Play with">
      <span className="bx-input__label">Play with</span>
      <div className="bx-input__segments">
        {INPUTS.map((option) => (
          <button
            key={option.input}
            type="button"
            aria-pressed={option.input === input}
            onClick={() => useBoxingStore.setState({ input: option.input, ...(option.input === "keys" ? { players: 1 } : {}) })}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Keyboard mode's keys, for the menu. */
export const KEY_HELP: readonly [string, string][] = [
  ["Jab, cross", "J and K"],
  ["Hooks", "U and I"],
  ["Uppercuts", "N and M"],
  ["Slip and duck", "A, D and S, or the arrows"],
  ["Body shot", "punch while holding S"],
  ["Guard", "Space. Shift for hooks, F for the body"],
  ["Touch gloves", "hold E"],
];
