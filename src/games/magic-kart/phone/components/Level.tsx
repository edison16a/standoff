"use client";
import { useEffect, useRef, useState } from "react";
import { useController } from "./session-context";

/** Tilt that pushes the bubble to the rim. */
const FULL_TILT = (20 * Math.PI) / 180;
/** Within this the phone counts as flat, and the level lights up. */
const FLAT = (3 * Math.PI) / 180;
const RIM_X = 64;
const RIM_Y = 26;

/**
 * A spirit level for the phone lying flat on its side, drawn as a wide
 * tube like the one on a carpenter's level. The bubble floats to the high
 * side: lift the right end and it slides right. Centring it before
 * calibrating means straight ahead really is straight. It follows the
 * sensors every frame, straight on the SVG, since React has no business
 * re-rendering 60 times a second.
 */
export function Level({ onFlat }: { onFlat?(flat: boolean): void }) {
  const session = useController();
  const bubbleRef = useRef<SVGEllipseElement>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    let frame = 0;
    let last = false;
    const draw = () => {
      const tilt = session.tilt;
      const bubble = bubbleRef.current;
      if (tilt && bubble) {
        const clamp = (v: number) => Math.max(-1, Math.min(1, v / FULL_TILT));
        // Right end down (positive roll) lifts the left end, so the bubble goes left.
        bubble.setAttribute("cx", String(80 - clamp(tilt.roll) * RIM_X));
        bubble.setAttribute("cy", String(40 - clamp(tilt.pitch) * RIM_Y));
        const now = Math.hypot(tilt.roll, tilt.pitch) < FLAT;
        if (now !== last) {
          last = now;
          setFlat(now);
          onFlat?.(now);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session, onFlat]);

  return (
    <svg className={`mk-level ${flat ? "mk-level--flat" : ""}`} viewBox="0 0 160 80" role="img" aria-label={flat ? "Flat" : "Not flat yet"}>
      <rect x="4" y="6" width="152" height="68" rx="34" className="mk-level__tube" />
      <path d="M62 10V70M98 10V70" className="mk-level__mark" />
      <circle cx="80" cy="40" r="4" className="mk-level__centre" />
      <ellipse ref={bubbleRef} cx="80" cy="40" rx="15" ry="13" className="mk-level__bubble" />
    </svg>
  );
}
