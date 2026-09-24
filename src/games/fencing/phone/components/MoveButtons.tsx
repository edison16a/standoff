"use client";
import { useEffect, useState } from "react";
import type { PointerEvent } from "react";
import { useController } from "./session-context";

type Held = { forward: boolean; back: boolean };

/**
 * Footwork: hold Forward to advance, Back to retreat. Forward sits on top
 * because with the phone held like a sword the top of the screen points at
 * the opponent. Holding both stands still.
 */
export function MoveButtons() {
  const session = useController();
  const [held, setHeld] = useState<Held>({ forward: false, back: false });

  useEffect(() => {
    session.setMove(held.forward === held.back ? 0 : held.forward ? 1 : -1);
  }, [held, session]);

  // Never leave the fencer walking when this screen goes away.
  useEffect(() => () => session.setMove(0), [session]);

  const bind = (key: keyof Held) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld((current) => ({ ...current, [key]: true }));
    },
    onPointerUp: () => setHeld((current) => ({ ...current, [key]: false })),
    onPointerCancel: () => setHeld((current) => ({ ...current, [key]: false })),
    onLostPointerCapture: () => setHeld((current) => ({ ...current, [key]: false })),
    onContextMenu: (event: { preventDefault(): void }) => event.preventDefault(),
  });

  return (
    <div className="moves">
      <button type="button" className={`hold ${held.forward ? "hold--on" : ""}`} {...bind("forward")}>
        Forward
      </button>
      <button type="button" className={`hold ${held.back ? "hold--on" : ""}`} {...bind("back")}>
        Back
      </button>
    </div>
  );
}

/** Jab and Parry buttons, only for devices with no motion sensors. */
export function StrikeButtons() {
  const session = useController();
  return (
    <div className="strikes">
      <button type="button" className="btn btn--lg" onPointerDown={() => session.strike("parry")}>
        Parry
      </button>
      <button type="button" className="btn btn--lg btn--primary" onPointerDown={() => session.strike("jab")}>
        Jab
      </button>
    </div>
  );
}
