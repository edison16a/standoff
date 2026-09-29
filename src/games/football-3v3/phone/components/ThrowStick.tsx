"use client";
import { useRef, useState } from "react";
import { stickFromOffset, type Stick } from "@/games/kit/pad/stick-math";

const RADIUS = 58;

/**
 * The QB's throw stick, under the right thumb. Hold it and push toward
 * a receiver on the big screen: the one nearest that line lights up.
 * Let go to throw to them. Resting the thumb back near the middle keeps
 * the last aim, so easing off never cancels a throw.
 */
export function ThrowStick({ disabled, onAim, onThrow }: { disabled: boolean; onAim(stick: Stick): void; onThrow(stick: Stick): void }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const last = useRef<Stick | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);

  const end = (thrown: boolean) => {
    const aim = last.current;
    origin.current = null;
    last.current = null;
    setKnob(null);
    if (thrown && aim) onThrow(aim);
  };

  return (
    <div
      className={`fb-throw ${disabled ? "fb-throw--off" : ""} ${knob ? "fb-throw--held" : ""}`}
      aria-label="Throw stick"
      onPointerDown={(event) => {
        if (origin.current || disabled) return;
        origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(event) => {
        const from = origin.current;
        if (!from || from.id !== event.pointerId) return;
        const dx = event.clientX - from.x;
        const dy = event.clientY - from.y;
        const length = Math.hypot(dx, dy);
        const cap = length > RADIUS ? RADIUS / length : 1;
        setKnob({ x: dx * cap, y: dy * cap });
        const stick = stickFromOffset(dx, dy, RADIUS);
        if (stick.x !== 0 || stick.y !== 0) {
          last.current = stick;
          onAim(stick);
        }
      }}
      onPointerUp={() => end(true)}
      onPointerCancel={() => end(false)}
      onLostPointerCapture={() => origin.current && end(true)}
    >
      <span className="fb-throw__ring">
        <span className="fb-throw__knob" style={{ transform: knob ? `translate(${knob.x}px, ${knob.y}px)` : undefined }} />
      </span>
      <span className="fb-throw__label">{disabled ? "No throw" : knob ? "Let go to throw" : "Aim and throw"}</span>
    </div>
  );
}
