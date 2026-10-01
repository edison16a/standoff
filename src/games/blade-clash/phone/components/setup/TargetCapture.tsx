"use client";
import { useEffect, useRef, useState } from "react";
import type { AimPoint } from "@/games/blade-clash/motion/sword-aim";
import type { Slot } from "@/games/blade-clash/players";
import { SteadyHold } from "@/games/blade-clash/phone/steady-hold";
import { VIEWS } from "@/games/blade-clash/render/split";
import { RING, TargetView, type TargetState } from "@/games/kit/aim/look/TargetView";
import type { Quat } from "@/games/kit/motion/math3d";
import { useController } from "../session-context";

/** After this long without a capture, offer to take the reading as it is. */
const OFFER_ANYWAY_MS = 9000;

interface TargetCaptureProps {
  slot: Slot;
  target: AimPoint;
  colour: string;
  /** Which target this is of how many, such as "2 of 6". */
  count: string;
  onCaptured(q: Quat): void;
}

/**
 * One calibration target. The picture shows where on their half of the big
 * screen to point, the same target the big screen shows. Holding still
 * fills the ring round it, and when it closes the reading is taken, with a
 * buzz and a chime. Nothing to tap. The look is the aim kit's, shared by
 * every aiming game.
 */
export function TargetCapture({ slot, target, colour, count, onCaptured }: TargetCaptureProps) {
  const session = useController();
  const ringRef = useRef<SVGCircleElement>(null);
  const [state, setState] = useState<TargetState>("point");
  const [offer, setOffer] = useState(false);
  const doneRef = useRef(onCaptured);
  useEffect(() => {
    doneRef.current = onCaptured;
  });

  useEffect(() => {
    const steady = new SteadyHold();
    const started = performance.now();
    let frame = 0;
    let captured = false;
    const draw = (now: number) => {
      const q = session.pipeline.rawOrientation;
      if (q && !captured) {
        const reading = steady.update(q, now);
        ringRef.current?.setAttribute("stroke-dashoffset", String(RING * (1 - reading.progress)));
        setState(reading.progress > 0.05 ? "holding" : "point");
        if (reading.progress >= 1) {
          captured = true;
          session.captured();
          doneRef.current(q);
        }
      }
      if (now - started > OFFER_ANYWAY_MS) setOffer(true);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  const anyway = () => session.pipeline.rawOrientation && doneRef.current(session.pipeline.rawOrientation);
  return <TargetView target={target} zone={VIEWS[slot]} colour={colour} state={state} ringRef={ringRef} count={count} onAnyway={offer ? anyway : undefined} />;
}
