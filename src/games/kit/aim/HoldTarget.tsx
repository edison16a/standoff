"use client";
import { useEffect, useRef, useState } from "react";
import { HoldProgress, SteadyWindow } from "@/games/kit/motion/steady-hold";
import type { AimZone, Pointing } from "./aim-math";
import { movedOn, pointingDistance, type AimTarget } from "./aim-targets";
import type { PhoneAim } from "./phone-aim";
import { PointGuide } from "./PointGuide";

/** After this long without a reading taken, offer to take it as it is, for a hand that never settles. */
const OFFER_ANYWAY_MS = 8000;

interface HoldTargetProps {
  aim: PhoneAim;
  target: AimTarget;
  colour: string;
  zone?: AimZone;
  /** Where the last target was taken. The phone must turn away from it before this one fills. */
  after: Pointing | null;
  /** Which target this is of how many, such as "2 of 6". */
  count: string;
  /** Called once, the moment the player has held still long enough. */
  onHeld(): void;
}

type State = "point" | "holding" | "done";

/**
 * One calibration target, taken by holding still. The picture shows
 * where to point; holding steady fills a ring round the target, and when
 * it closes the target turns green and the reading is taken, with a buzz.
 * Nothing to tap, so a tap can never nudge the aim off.
 */
export function HoldTarget({ aim, target, colour, zone, after, count, onHeld }: HoldTargetProps) {
  const ringRef = useRef<SVGCircleElement>(null);
  const [state, setState] = useState<State>("point");
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
    const started = performance.now();
    let frame = 0;
    let last: State = "point";
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const reading = aim.pointing;
      if (doneRef.current || !reading) return;
      const progress = hold.update(still.update(reading, now) && movedOn(reading, after), now);
      const ring = ringRef.current;
      if (ring) ring.style.strokeDashoffset = String(Number(ring.getAttribute("stroke-dasharray")) * (1 - progress));
      const next: State = progress > 0.05 ? "holding" : "point";
      if (next !== last) setState((last = next));
      if (progress >= 1) takeRef.current();
      if (now - started > OFFER_ANYWAY_MS) setOffer(true);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [aim, after]);

  const hint = state === "done" ? "Got it" : state === "holding" ? "Hold it there" : aim.pointing ? "Point and hold still" : "Waiting for the motion sensors";
  return (
    <>
      <PointGuide target={target} colour={colour} zone={zone} ringRef={ringRef} done={state === "done"} />
      <p className={`kit-hold kit-hold--${state}`} role="status" aria-live="polite">
        <span className="kit-hold__count">{count}</span>
        <span>{hint}</span>
      </p>
      {offer && state !== "done" && (
        <button type="button" className="btn btn--ghost btn--block" disabled={!aim.pointing} onClick={() => aim.pointing && take()}>
          Use where I point now
        </button>
      )}
    </>
  );
}
