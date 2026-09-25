"use client";
import { useEffect, useRef } from "react";
import type { StrikeAction } from "@/games/fencing/protocol";
import { LISTEN_LEVEL } from "@/games/fencing/phone/practice";
import { useController } from "../session-context";

const HALF = 70;
/**
 * What fills each gauge, and where its line sits. A jab's score is how
 * hard the phone moved, and the practice counts from the listening level.
 * A parry's is how near the blade is to the parry point, which is 1.
 */
const GAUGE: Record<StrikeAction, { full: number; mark: number }> = {
  jab: { full: 2.2, mark: LISTEN_LEVEL },
  parry: { full: 1.25, mark: 1 },
};

/**
 * A live gauge of the action the player is asked for: it fills as they
 * move, with a line where it counts. It shows at a glance whether a jab
 * was too soft, or how far the blade still has to rise for a parry, drawn
 * straight on the SVG every frame.
 */
export function StrengthMeter({ action }: { action: StrikeAction }) {
  const session = useController();
  const fillRef = useRef<SVGRectElement>(null);
  const peakRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    let frame = 0;
    let peak = 0;
    let last = performance.now();
    const { full } = GAUGE[action];
    const draw = (now: number) => {
      const score = Math.max(0, session.pipeline.strikeScores[action]);
      // The peak marker holds the best recent value, then sinks slowly.
      peak = Math.max(score, peak - ((now - last) / 1000) * 1.2);
      last = now;
      const fill = Math.min(1, score / full) * HALF;
      const hold = Math.min(1, peak / full) * HALF;
      fillRef.current?.setAttribute("height", String(fill));
      peakRef.current?.setAttribute("y", String(action === "jab" ? 80 + hold - 2 : 80 - hold));
      if (action === "parry") fillRef.current?.setAttribute("y", String(80 - fill));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session, action]);

  const mark = (GAUGE[action].mark / GAUGE[action].full) * HALF;
  const label = action === "jab" ? "How hard you moved" : "How near the parry point you are";
  return (
    <svg className={`strength strength--${action}`} viewBox="0 0 40 160" role="img" aria-label={label}>
      <rect x="12" y="8" width="16" height="144" rx="8" className="strength__track" />
      <rect ref={fillRef} x="12" y="80" width="16" height="0" rx="6" className="strength__fill" />
      <rect ref={peakRef} x="10" y="79" width="20" height="2" rx="1" className="strength__peak" />
      <path d={action === "jab" ? `M6 ${80 + mark}h28` : `M6 ${80 - mark}h28`} className="strength__mark" />
      <path d="M8 80h24" className="strength__zero" />
    </svg>
  );
}
