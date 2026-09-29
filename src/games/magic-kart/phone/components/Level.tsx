"use client";
import "../../styles/level-hold.css";
import { useEffect, useRef, useState } from "react";
import { HoldProgress } from "@/games/kit/motion/steady-hold";
import { useController } from "./session-context";

/** Wheel angle that pushes the bubble to the end of the tube. */
const FULL_TURN = (20 * Math.PI) / 180;
/** Within this the wheel counts as level, and the level lights up. */
const LEVEL = (3 * Math.PI) / 180;
/** Leaning back or forward further than this is too far from holding it like a wheel. */
const UPRIGHT = (55 * Math.PI) / 180;
const TRAVEL = 34;
/** Holding the dot in the middle this long sets straight ahead. */
export const LEVEL_HOLD_MS = 1000;
/** The fill bar under the tube, in the picture's units. */
const BAR = { x: 50, w: 100 };

/** How the phone is held right now, for the level and the words beside it. */
export type Hold = "level" | "turned" | "flat";

interface LevelProps {
  onHold?(hold: Hold): void;
  /** Counts the hold toward setting straight ahead, when the phone is sideways and ready. */
  armed?: boolean;
  /** Called once the dot has stayed in the middle for the whole hold. */
  onHeld?(): void;
  /** Straight ahead is set: the whole level shows green. */
  done?: boolean;
}

/**
 * A picture of the phone held sideways inside a steering wheel, with
 * arrows for turning it, and a spirit level on the pictured screen. The
 * bubble floats to the high end: turn the wheel right and the left end
 * rises, so it slides left. Holding it between the lines fills the bar
 * under it, and when full straight ahead is set on its own. It follows
 * the sensors every frame, straight on the SVG, since React has no
 * business re-rendering 60 times a second.
 */
export function Level({ onHold, armed = false, onHeld, done = false }: LevelProps) {
  const session = useController();
  const bubbleRef = useRef<SVGEllipseElement>(null);
  const barRef = useRef<SVGRectElement>(null);
  const [hold, setHold] = useState<Hold>("turned");
  const heldRef = useRef(onHeld);
  useEffect(() => {
    heldRef.current = onHeld;
  });

  useEffect(() => {
    let frame = 0;
    let last: Hold = "turned";
    const meter = new HoldProgress(LEVEL_HOLD_MS);
    let fired = false;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const tilt = session.tilt;
      const bubble = bubbleRef.current;
      if (!tilt || !bubble) return;
      const off = Math.max(-1, Math.min(1, tilt.wheel / FULL_TURN));
      bubble.setAttribute("cx", String(100 - off * TRAVEL));
      const at: Hold = Math.abs(tilt.lean) > UPRIGHT ? "flat" : Math.abs(tilt.wheel) < LEVEL ? "level" : "turned";
      if (at !== last) {
        last = at;
        setHold(at);
        onHold?.(at);
      }
      if (!armed || done || fired) return;
      const progress = meter.update(at === "level", now);
      barRef.current?.setAttribute("width", String(BAR.w * progress));
      if (progress >= 1) {
        fired = true;
        heldRef.current?.();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session, onHold, armed, done]);

  const lit = done || hold === "level";
  return (
    <svg
      className={`mk-level ${lit ? "mk-level--on" : ""} ${done ? "mk-level--done" : ""}`}
      viewBox="0 0 200 140"
      role="img"
      aria-label={`Phone held sideways and upright like a steering wheel. ${done ? "Straight ahead is set" : hold === "level" ? "Level" : "Not level yet"}`}
    >
      <circle cx="100" cy="72" r="54" className="mk-level__rim" />
      <path d="M124 12.7A64 64 0 0 1 156.5 42M76 12.7A64 64 0 0 0 43.5 42" className="mk-level__arrow" />
      <path d="M151.2 44.8 159.8 48.1 161.8 39.1zM38.2 39.1 40.2 48.1 48.8 44.8z" className="mk-level__head" />
      <rect x="32" y="41" width="136" height="64" rx="13" className="mk-level__phone" />
      <rect x="39" y="47" width="122" height="52" rx="8" className="mk-level__screen" />
      <rect x="50" y="59" width="100" height="28" rx="14" className="mk-level__tube" />
      <path d="M88 62V84M112 62V84" className="mk-level__mark" />
      <ellipse ref={bubbleRef} cx="100" cy="73" rx="10" ry="9" className="mk-level__bubble" />
      <rect x={BAR.x} y="90" width={BAR.w} height="5" rx="2.5" className="mk-level__track" />
      <rect ref={barRef} x={BAR.x} y="90" width={done ? BAR.w : 0} height="5" rx="2.5" className="mk-level__fill" />
    </svg>
  );
}
