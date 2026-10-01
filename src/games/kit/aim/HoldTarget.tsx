"use client";
import { useEffect, useRef, useState } from "react";
import { HoldProgress, SteadyWindow } from "@/games/kit/motion/steady-hold";
import { WHOLE_SCREEN, type AimZone, type Pointing } from "./aim-math";
import { pointingDistance, TARGET_POINTS, TargetGate, type AimTarget } from "./aim-targets";
import { TargetView, type TargetState } from "./look/TargetView";
import type { PhoneAim } from "./phone-aim";

/** After this long without a reading taken, offer to take it as it is, for a hand that never settles. */
const OFFER_ANYWAY_MS = 8000;

interface HoldTargetProps {
  aim: PhoneAim;
  target: AimTarget;
  colour: string;
  zone?: AimZone;
  /** Where the last target was taken. The phone must turn away from it before this one fills. Null for the first. */
  after: Pointing | null;
  /** Which target this is of how many, such as "2 of 6". */
  count: string;
  /** Called once, the moment the player has held still long enough. */
  onHeld(): void;
}

/**
 * One calibration target, taken by holding still. The picture shows
 * where to point; holding steady fills a ring round the target, and when
 * it closes the dot pops and the reading is taken, with a buzz. Nothing
 * to tap, so a tap can never nudge the aim off. It looks the way Blade
 * Clash first drew it (see look/TargetView).
 */
export function HoldTarget({ aim, target, colour, zone, after, count, onHeld }: HoldTargetProps) {
  const ringRef = useRef<SVGCircleElement>(null);
  const [state, setState] = useState<TargetState>("point");
  const [offer, setOffer] = useState(false);
  const heldRef = useRef(onHeld);
  const doneRef = useRef(false);
  useEffect(() => {
    heldRef.current = onHeld;
  });

  const take = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (ringRef.current) ringRef.current.style.strokeDashoffset = "0";
    setState("done");
    navigator.vibrate?.(40);
    heldRef.current();
  };
  const takeRef = useRef(take);
  useEffect(() => {
    takeRef.current = take;
  });

  useEffect(() => {
    const still = new SteadyWindow<Pointing>(pointingDistance);
    const hold = new HoldProgress();
    const gate = new TargetGate(after);
    const started = performance.now();
    let frame = 0;
    let last: TargetState = "point";
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const reading = aim.pointing;
      if (doneRef.current || !reading) return;
      // Both see every reading, so the gate knows how the page found the phone before it ever settles.
      const open = gate.open(reading);
      const progress = hold.update(still.update(reading, now) && open, now);
      const ring = ringRef.current;
      if (ring) ring.style.strokeDashoffset = String(Number(ring.getAttribute("stroke-dasharray")) * (1 - progress));
      const next: TargetState = progress > 0.05 ? "holding" : "point";
      if (next !== last) setState((last = next));
      if (progress >= 1) takeRef.current();
      if (now - started > OFFER_ANYWAY_MS) setOffer(true);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [aim, after]);

  return (
    <TargetView
      target={TARGET_POINTS[target]}
      zone={zone ?? WHOLE_SCREEN}
      colour={colour}
      state={state}
      ringRef={ringRef}
      count={count}
      hint={aim.pointing || state === "done" ? undefined : "Waiting for the motion sensors"}
      onAnyway={offer && aim.pointing ? () => aim.pointing && take() : undefined}
    />
  );
}
