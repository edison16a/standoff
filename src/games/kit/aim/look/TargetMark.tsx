import "./target-mark.css";
import type { CSSProperties } from "react";

interface TargetMarkProps {
  /** Where its middle sits, as CSS lengths in its positioned parent. */
  left: string;
  top: string;
  colour: string;
  /** Words on dark pills under it, one per line, such as who should point there. */
  words?: readonly string[];
  /** Puts the words above, for a target near the bottom of its view. */
  wordsAbove?: boolean;
  /** Lines the words up with the target's left or right side, for a target near an edge, so they stay on screen. */
  align?: "start" | "center" | "end";
  label?: string;
}

/**
 * A calibration target on the big screen, as every aiming game draws it:
 * a pulsing ring in the player's colour round a solid dot, with a dark
 * halo and a glow so it reads on any scene from across the room.
 */
export function TargetMark({ left, top, colour, words = [], wordsAbove = false, align = "center", label }: TargetMarkProps) {
  const style = { "--lamp": colour, left, top } as CSSProperties;
  return (
    <span className="calib-target" style={style} role="img" aria-label={label ?? "Calibration target"}>
      {words.length > 0 && (
        <span className={`calib-target__words calib-target__words--${align} ${wordsAbove ? "calib-target__words--above" : ""}`}>
          {words.map((word) => (
            <span key={word} className="calib-target__word">
              {word}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/** A note in a player's colour at the bottom of their view, for a calibration step with no target, such as trying the aim. */
export function TargetNote({ left, colour, children }: { left: string; colour: string; children: string }) {
  return (
    <span className="calib-note" style={{ "--lamp": colour, left } as CSSProperties}>
      {children}
    </span>
  );
}
