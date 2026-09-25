"use client";
import "./pad.css";
import { useRef, useState } from "react";
import { CENTER, stickFromOffset, type Stick } from "./stick-math";

/** How far the thumb travels for full throw, in CSS pixels. */
const RADIUS = 64;

interface JoystickProps {
  onChange(stick: Stick): void;
  /** Tints the knob, usually the player's or team's colour. */
  colour?: string;
  /**
   * Keeps the base and knob on screen at rest, in the middle of the area,
   * so it is plain how to move before the first touch. The stick still
   * floats to wherever the thumb lands.
   */
  alwaysShown?: boolean;
}

interface View {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

function Base({ left, top, knob, resting }: { left: number | string; top: number | string; knob: string; resting: boolean }) {
  return (
    <span className={`kit-stick__base${resting ? " kit-stick__base--rest" : ""}`} style={{ left, top }}>
      <span className="kit-stick__knob" style={{ transform: knob }} />
    </span>
  );
}

/**
 * A floating thumb stick filling its area, usually the left half of the
 * phone. The stick's centre is wherever the thumb lands, so players never
 * have to find a fixed circle without looking. Letting go centres it.
 */
export function Joystick({ onChange, colour, alwaysShown = false }: JoystickProps) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [view, setView] = useState<View | null>(null);

  const end = () => {
    origin.current = null;
    setView(null);
    onChange(CENTER);
  };

  let content: React.ReactNode;
  if (view) content = <Base left={view.x} top={view.y} knob={`translate(${view.dx}px, ${view.dy}px)`} resting={false} />;
  else if (alwaysShown)
    content = (
      <>
        <Base left="50%" top="50%" knob="none" resting />
        <span className="kit-stick__label">Move</span>
      </>
    );
  else content = <span className="kit-stick__hint">Move</span>;

  return (
    <div
      className="kit-stick"
      style={colour ? ({ "--pad-colour": colour } as React.CSSProperties) : undefined}
      onPointerDown={(event) => {
        if (origin.current) return;
        const box = event.currentTarget.getBoundingClientRect();
        origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setView({ x: event.clientX - box.left, y: event.clientY - box.top, dx: 0, dy: 0 });
      }}
      onPointerMove={(event) => {
        const from = origin.current;
        if (!from || from.id !== event.pointerId) return;
        const dx = event.clientX - from.x;
        const dy = event.clientY - from.y;
        const length = Math.hypot(dx, dy);
        const cap = length > RADIUS ? RADIUS / length : 1;
        setView((last) => (last ? { ...last, dx: dx * cap, dy: dy * cap } : last));
        onChange(stickFromOffset(dx, dy, RADIUS));
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={() => origin.current && end()}
    >
      {content}
    </div>
  );
}
