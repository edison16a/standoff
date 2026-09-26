"use client";
import { useEffect, useState } from "react";
import type { PointerEvent } from "react";
import { useController } from "./session-context";

type Held = { forward: boolean; back: boolean };

/**
 * Footwork: hold Forward to step in, Back to step away, along the line
 * between the fighters. Forward sits on top because with the phone held
 * like a sword the top of the screen points at the opponent. Holding both
 * stands still.
 */
export function MoveButtons() {
  const session = useController();
  const [held, setHeld] = useState<Held>({ forward: false, back: false });

  useEffect(() => {
    session.setMove(held.forward === held.back ? 0 : held.forward ? 1 : -1);
  }, [held, session]);

  // Never leave the fighter walking when this screen goes away.
  useEffect(() => () => session.setMove(0), [session]);

  const release = (key: keyof Held) => setHeld((current) => ({ ...current, [key]: false }));
  const bind = (key: keyof Held) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld((current) => ({ ...current, [key]: true }));
    },
    onPointerUp: () => release(key),
    onPointerCancel: () => release(key),
    onLostPointerCapture: () => release(key),
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
  });

  return (
    <div className="moves">
      <button type="button" className={`hold hold--forward ${held.forward ? "hold--on" : ""}`} {...bind("forward")}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="hold__arrow">
          <path d="M12 5l-7 8h4v6h6v-6h4z" />
        </svg>
        Forward
      </button>
      <button type="button" className={`hold hold--back ${held.back ? "hold--on" : ""}`} {...bind("back")}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="hold__arrow">
          <path d="M12 19l7-8h-4V5H9v6H5z" />
        </svg>
        Back
      </button>
    </div>
  );
}
