"use client";
import { useEffect, useRef } from "react";
import { useController } from "./session-context";

/** The arc is part of a circle this big, centred below the middle, and full lock is this far round it. */
const R = 120;
const CX = 100;
const CY = 132;
const LOCK = (38 * Math.PI) / 180;

function point(angle: number): string {
  return `${(CX + R * Math.sin(angle)).toFixed(1)} ${(CY - R * Math.cos(angle)).toFixed(1)}`;
}

/**
 * The top of a steering wheel, with a dot that slides round it as the
 * player turns the phone, so they can see the steering is live and how
 * far they are turning. Drawn straight on the SVG every frame.
 */
export function SteerArc() {
  const session = useController();
  const fillRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const angle = session.steer * LOCK;
      fillRef.current?.setAttribute("d", `M${point(0)}A${R} ${R} 0 0 ${angle > 0 ? 1 : 0} ${point(angle)}`);
      const [x, y] = point(angle).split(" ");
      dotRef.current?.setAttribute("cx", x!);
      dotRef.current?.setAttribute("cy", y!);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return (
    <svg className="mk-arc" viewBox="0 0 200 52" aria-hidden="true">
      <path d={`M${point(-LOCK)}A${R} ${R} 0 0 1 ${point(LOCK)}`} className="mk-arc__track" />
      <path ref={fillRef} className="mk-arc__fill" />
      <path d={`M${CX} 4v14`} className="mk-arc__tick" />
      <circle ref={dotRef} cx={CX} cy={CY - R} r="7" className="mk-arc__dot" />
    </svg>
  );
}
