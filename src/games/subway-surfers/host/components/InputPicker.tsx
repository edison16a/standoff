"use client";
import { setInput, useSurfStore, type InputMode } from "../store";
import { ModeIcon } from "./icons";

const MODES: readonly { mode: InputMode; label: string }[] = [
  { mode: "camera", label: "Camera" },
  { mode: "keyboard", label: "Keyboard" },
];

/** How to play: in front of the camera, or with the arrow keys or WASD. Keyboard skips the camera setup. */
export function InputPicker() {
  const input = useSurfStore((s) => s.input);
  return (
    <div className="ss-level__chips" role="radiogroup" aria-label="Play with">
      {MODES.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={input === mode}
          className={`ss-chip ss-chip--mode${input === mode ? " ss-chip--on" : ""}`}
          onClick={() => setInput(mode)}
        >
          <ModeIcon mode={mode} />
          {label}
        </button>
      ))}
    </div>
  );
}
