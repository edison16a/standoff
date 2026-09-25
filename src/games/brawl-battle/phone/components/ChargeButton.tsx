"use client";
import { useEffect, useRef, useState } from "react";
import { PadButton } from "@/games/kit/pad/PadButton";
import { CHARGE, FPS } from "../../engine/tuning";
import type { ButtonName } from "../../protocol";
import { useController } from "./session-context";

/** 0 before a hold turns into a charge, then up to 1 at full power. */
export function chargeProgress(heldSeconds: number): number {
  const into = heldSeconds * FPS - CHARGE.threshold;
  return into <= 0 ? 0 : Math.min(1, into / CHARGE.full);
}

const R = 47;
const LENGTH = 2 * Math.PI * R;

/**
 * Attack 1 or Attack 2. A tap is a quick move; holding it charges, and a
 * ring round the button fills from the moment the hold becomes a charge
 * to full power. The ring runs on the phone's own clock, so it answers
 * the thumb at once instead of waiting on the host.
 */
export function ChargeButton({ button, label, colour, size }: { button: ButtonName; label: string; colour: string; size?: "lg" | "md" }) {
  const session = useController();
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const since = useRef(0);

  useEffect(() => {
    if (!held) return;
    let frame = 0;
    const tick = () => {
      setProgress(chargeProgress((performance.now() - since.current) / 1000));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [held]);

  const down = () => {
    since.current = performance.now();
    setHeld(true);
    session.press(button);
  };
  const up = () => {
    setHeld(false);
    setProgress(0);
    session.release(button);
  };
  const state = progress >= 1 ? "full" : progress > 0 ? "charging" : "idle";

  return (
    <div className={`bb-charge bb-charge--${state}`} style={{ "--pad-colour": colour } as React.CSSProperties}>
      <svg className="bb-charge__ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} className="bb-charge__fill" strokeDasharray={`${LENGTH * progress} ${LENGTH}`} transform="rotate(-90 50 50)" />
      </svg>
      <PadButton label={`${label}. Tap for a quick move, hold to charge.`} size={size} colour={colour} onDown={down} onUp={up}>
        <span>{label}</span>
      </PadButton>
    </div>
  );
}
