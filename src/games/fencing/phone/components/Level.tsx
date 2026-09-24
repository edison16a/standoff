"use client";
import { useEffect, useRef, useState } from "react";
import { useController } from "./session-context";

/** Tilt that pushes the bubble to the rim. */
const FULL_TILT = (30 * Math.PI) / 180;
/** Within this the phone counts as level, and the bubble lights up. */
export const LEVEL_TOLERANCE = (5 * Math.PI) / 180;
const RIM = 40;

/**
 * A bubble level, seen from above, for the phone held flat with its top
 * edge toward the screen. Tip the top up and the bubble rises, tip a side
 * down and it slides that way. Centring it before calibrating gives the
 * same guard every time. It follows the sensors every frame, directly on
 * the SVG, since React has no business re-rendering 60 times a second.
 */
export function Level({ onLevel }: { onLevel?(level: boolean): void }) {
  const session = useController();
  const bubbleRef = useRef<SVGCircleElement>(null);
  const [isLevel, setIsLevel] = useState(false);

  useEffect(() => {
    let frame = 0;
    let last = false;
    const draw = () => {
      const reading = session.pipeline.level;
      const bubble = bubbleRef.current;
      if (reading && bubble) {
        const clamp = (v: number) => Math.max(-1, Math.min(1, v / FULL_TILT)) * RIM;
        bubble.setAttribute("cx", String(50 + clamp(reading.roll)));
        bubble.setAttribute("cy", String(50 - clamp(reading.pitch)));
        const level = Math.hypot(reading.pitch, reading.roll) < LEVEL_TOLERANCE;
        if (level !== last) {
          last = level;
          setIsLevel(level);
          onLevel?.(level);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session, onLevel]);

  return (
    <svg className={`level ${isLevel ? "level--on" : ""}`} viewBox="0 0 100 100" role="img" aria-label={isLevel ? "Level" : "Not level yet"}>
      <circle cx="50" cy="50" r="46" className="level__rim" />
      <circle cx="50" cy="50" r="12" className="level__target" />
      <path d="M50 8V92M8 50H92" className="level__cross" />
      <circle ref={bubbleRef} cx="50" cy="50" r="9" className="level__bubble" />
    </svg>
  );
}
