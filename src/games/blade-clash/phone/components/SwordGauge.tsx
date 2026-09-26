"use client";
import { useEffect, useRef } from "react";
import { DEFAULT_GUARD, type AimPoint } from "@/games/blade-clash/motion/sword-aim";
import { useController } from "./session-context";

/** The picture is the player's own view: half a 16 by 9 screen, so 8 by 9. */
const W = 160;
const H = 180;
/** How far past the edge the tip is still drawn, in view units. */
const EDGE = 1.2;

const toView = (point: AimPoint) => ({
  x: W / 2 + (Math.max(-EDGE, Math.min(EDGE, point.x)) * W) / 2 / EDGE,
  y: H / 2 - (Math.max(-EDGE, Math.min(EDGE, point.y)) * H) / 2 / EDGE,
});

/**
 * A live picture of the sword: the player's view with the opponent in the
 * middle and the blade pointing wherever the phone points, thicker the
 * further the arm reaches. It is drawn every frame straight from the
 * phone's own reading, so it never waits for the network.
 */
export function SwordGauge({ colour, className }: { colour: string; className?: string }) {
  const session = useController();
  const bladeRef = useRef<SVGLineElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const handRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const aim = session.pipeline.aim ?? session.pipeline.guard ?? DEFAULT_GUARD;
      const { reach, roll } = session.pipeline.control;
      const tip = toView(aim);
      // The hand sits low and right, and moves a little toward where the blade points.
      const hand = { x: W * 0.62 + (tip.x - W / 2) * 0.25, y: H * 0.88 + (tip.y - H / 2) * 0.15 - reach * 18 };
      const blade = bladeRef.current;
      if (blade) {
        blade.setAttribute("x1", hand.x.toFixed(1));
        blade.setAttribute("y1", hand.y.toFixed(1));
        blade.setAttribute("x2", tip.x.toFixed(1));
        blade.setAttribute("y2", tip.y.toFixed(1));
        // The flat of the blade shows as it turns, and it grows bolder as the arm stretches out.
        blade.setAttribute("stroke-width", ((5 + reach * 5) * (0.55 + 0.45 * Math.abs(Math.cos(roll)))).toFixed(1));
      }
      tipRef.current?.setAttribute("cx", tip.x.toFixed(1));
      tipRef.current?.setAttribute("cy", tip.y.toFixed(1));
      handRef.current?.setAttribute("cx", hand.x.toFixed(1));
      handRef.current?.setAttribute("cy", hand.y.toFixed(1));
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return (
    <svg className={`sword-gauge ${className ?? ""}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Where your sword points">
      <rect x="1" y="1" width={W - 2} height={H - 2} rx="10" className="sword-gauge__view" />
      <path d={`M${W / 2} 14V${H - 14}M14 ${H / 2}H${W - 14}`} className="sword-gauge__cross" />
      {/* The opponent, standing in the middle of the view. */}
      <circle cx={W / 2} cy={H * 0.33} r="11" className="sword-gauge__foe" />
      <path d={`M${W / 2 - 20} ${H * 0.43}h40l-6 50h-28z`} className="sword-gauge__foe" />
      <line ref={bladeRef} x1={W * 0.62} y1={H * 0.95} x2={W / 2} y2={H / 2} className="sword-gauge__blade" style={{ stroke: colour }} />
      <circle ref={handRef} cx={W * 0.62} cy={H * 0.95} r="7" className="sword-gauge__hand" />
      <circle ref={tipRef} cx={W / 2} cy={H / 2} r="5" className="sword-gauge__tip" style={{ fill: colour }} />
    </svg>
  );
}
