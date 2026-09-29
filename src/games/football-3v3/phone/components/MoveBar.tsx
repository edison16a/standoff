"use client";
import { useRef, useState } from "react";
import type { Stick } from "@/games/kit/pad/stick-math";

/** How far the thumb slides for full speed: a long way across, a short way up and down. */
const REACH_X = 90;
const REACH_Y = 46;
const DEAD = 0.12;

function axis(offset: number, reach: number): number {
  const v = Math.max(-1, Math.min(1, offset / reach));
  return Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD);
}

/**
 * The QB's move bar: a wide track the left thumb slides along. Across
 * is the main move, sliding in the pocket from side to side; a shorter
 * push up steps up or scrambles, down drops back. Like the kit's stick,
 * its centre is wherever the thumb lands, and letting go stops.
 */
export function MoveBar({ onChange, colour }: { onChange(stick: Stick): void; colour: string }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null);

  const end = () => {
    origin.current = null;
    setKnob(null);
    onChange({ x: 0, y: 0 });
  };

  return (
    <div
      className="fb-bar"
      style={{ "--pad-colour": colour } as React.CSSProperties}
      onPointerDown={(event) => {
        if (origin.current) return;
        origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(event) => {
        const from = origin.current;
        if (!from || from.id !== event.pointerId) return;
        const dx = Math.max(-REACH_X, Math.min(REACH_X, event.clientX - from.x));
        const dy = Math.max(-REACH_Y, Math.min(REACH_Y, event.clientY - from.y));
        setKnob({ x: dx, y: dy });
        onChange({ x: axis(dx, REACH_X), y: -axis(dy, REACH_Y) });
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={() => origin.current && end()}
    >
      <span className="fb-bar__track">
        <span className="fb-bar__arrow fb-bar__arrow--left" aria-hidden />
        <span className="fb-bar__knob" style={{ transform: knob ? `translate(${knob.x}px, ${knob.y * 0.6}px)` : undefined }} />
        <span className="fb-bar__arrow fb-bar__arrow--right" aria-hidden />
      </span>
      <span className="fb-bar__label">Move</span>
    </div>
  );
}
