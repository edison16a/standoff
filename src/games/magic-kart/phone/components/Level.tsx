"use client";
import { useEffect, useRef, useState } from "react";
import { useController } from "./session-context";

/** Wheel angle that pushes the bubble to the end of the tube. */
const FULL_TURN = (20 * Math.PI) / 180;
/** Within this the wheel counts as level, and the level lights up. */
const LEVEL = (3 * Math.PI) / 180;
/** Leaning back or forward further than this is too far from holding it like a wheel. */
const UPRIGHT = (55 * Math.PI) / 180;
const TRAVEL = 34;

/** How the phone is held right now, for the level and the words beside it. */
export type Hold = "level" | "turned" | "flat";

/**
 * A picture of the phone held sideways inside a steering wheel, with
 * arrows for turning it, and a spirit level on the pictured screen. The
 * bubble floats to the high end: turn the wheel right and the left end
 * rises, so it slides left. Centring it before calibrating means straight
 * ahead really is straight. It follows the sensors every frame, straight
 * on the SVG, since React has no business re-rendering 60 times a second.
 */
export function Level({ onHold }: { onHold?(hold: Hold): void }) {
  const session = useController();
  const bubbleRef = useRef<SVGEllipseElement>(null);
  const [hold, setHold] = useState<Hold>("turned");

  useEffect(() => {
    let frame = 0;
    let last: Hold = "turned";
    const draw = () => {
      const tilt = session.tilt;
      const bubble = bubbleRef.current;
      if (tilt && bubble) {
        const off = Math.max(-1, Math.min(1, tilt.wheel / FULL_TURN));
        bubble.setAttribute("cx", String(100 - off * TRAVEL));
        const now: Hold = Math.abs(tilt.lean) > UPRIGHT ? "flat" : Math.abs(tilt.wheel) < LEVEL ? "level" : "turned";
        if (now !== last) {
          last = now;
          setHold(now);
          onHold?.(now);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session, onHold]);

  return (
    <svg
      className={`mk-level ${hold === "level" ? "mk-level--on" : ""}`}
      viewBox="0 0 200 140"
      role="img"
      aria-label={`Phone held sideways and upright like a steering wheel. ${hold === "level" ? "Level" : "Not level yet"}`}
    >
      <circle cx="100" cy="72" r="54" className="mk-level__rim" />
      <path d="M124 12.7A64 64 0 0 1 156.5 42M76 12.7A64 64 0 0 0 43.5 42" className="mk-level__arrow" />
      <path d="M151.2 44.8 159.8 48.1 161.8 39.1zM38.2 39.1 40.2 48.1 48.8 44.8z" className="mk-level__head" />
      <rect x="32" y="41" width="136" height="64" rx="13" className="mk-level__phone" />
      <rect x="39" y="47" width="122" height="52" rx="8" className="mk-level__screen" />
      <rect x="50" y="59" width="100" height="28" rx="14" className="mk-level__tube" />
      <path d="M88 62V84M112 62V84" className="mk-level__mark" />
      <ellipse ref={bubbleRef} cx="100" cy="73" rx="10" ry="9" className="mk-level__bubble" />
    </svg>
  );
}
