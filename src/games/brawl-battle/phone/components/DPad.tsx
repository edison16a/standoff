"use client";
import { useRef, useState } from "react";
import { CENTER, type Stick } from "@/games/kit/pad/stick-math";
import { dpadStick } from "../dpad-math";

const ARMS = [
  { name: "up", d: "M38 6h24a4 4 0 0 1 4 4v28H34V10a4 4 0 0 1 4-4z", on: (s: Stick) => s.y > 0.3 },
  { name: "down", d: "M34 62h32v28a4 4 0 0 1-4 4H38a4 4 0 0 1-4-4z", on: (s: Stick) => s.y < -0.3 },
  { name: "left", d: "M10 34h28v32H10a4 4 0 0 1-4-4V38a4 4 0 0 1 4-4z", on: (s: Stick) => s.x < -0.3 },
  { name: "right", d: "M62 34h28a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H62z", on: (s: Stick) => s.x > 0.3 },
] as const;

/**
 * A direction pad like a console's, filling its area. The thumb can
 * land anywhere in the area and slide; the direction is read from the
 * cross in the middle, eight ways. Letting go centres it.
 */
export function DPad({ onChange, colour }: { onChange(stick: Stick): void; colour: string }) {
  const pointer = useRef<number | null>(null);
  const [stick, setStick] = useState<Stick>(CENTER);

  const read = (event: React.PointerEvent<HTMLDivElement>) => {
    const cross = event.currentTarget.querySelector("svg")!.getBoundingClientRect();
    const next = dpadStick(event.clientX - (cross.left + cross.width / 2), event.clientY - (cross.top + cross.height / 2), cross.width * 0.12);
    setStick((last) => (last.x === next.x && last.y === next.y ? last : next));
    onChange(next);
  };
  const end = () => {
    pointer.current = null;
    setStick(CENTER);
    onChange(CENTER);
  };

  return (
    <div
      className="bb-dpad"
      style={{ "--pad-colour": colour } as React.CSSProperties}
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        read(event);
      }}
      onPointerMove={(event) => pointer.current === event.pointerId && read(event)}
      onPointerUp={(event) => pointer.current === event.pointerId && end()}
      onPointerCancel={(event) => pointer.current === event.pointerId && end()}
      onLostPointerCapture={() => pointer.current !== null && end()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg className="bb-dpad__cross" viewBox="0 0 100 100" role="img" aria-label="Direction pad. Up jumps, press it again in the air to double jump.">
        {ARMS.map((arm) => (
          <path key={arm.name} d={arm.d} className={`bb-dpad__arm ${arm.on(stick) ? "bb-dpad__arm--on" : ""}`} />
        ))}
        <rect x="34" y="34" width="32" height="32" className="bb-dpad__hub" />
        <path d="M50 12l-7 9h14zM50 88l-7-9h14zM12 50l9-7v14zM88 50l-9-7v14z" className="bb-dpad__arrow" />
      </svg>
      <span className="bb-dpad__hint">Up to jump</span>
    </div>
  );
}
