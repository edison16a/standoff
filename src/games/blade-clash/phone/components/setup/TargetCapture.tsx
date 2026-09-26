"use client";
import { useEffect, useRef, useState } from "react";
import type { AimPoint } from "@/games/blade-clash/motion/sword-aim";
import type { Slot } from "@/games/blade-clash/players";
import { SteadyHold } from "@/games/blade-clash/phone/steady-hold";
import type { Quat } from "@/games/kit/motion/math3d";
import { useController } from "../session-context";

/** The progress ring's circumference, for its dash. */
const RING = 2 * Math.PI * 17;
/** After this long without a capture, offer to take the reading as it is. */
const OFFER_ANYWAY_MS = 9000;

/** The big screen in miniature: 16 by 9, split in two, with this player's half lit. */
const TV = { x: 10, y: 10, w: 300, h: 169 };

/**
 * One calibration target. The picture shows where on their half of the big
 * screen to point, the same target the big screen shows. Holding still
 * fills the ring round it, and when it closes the reading is taken, with a
 * buzz and a chime. Nothing to tap.
 */
export function TargetCapture({ slot, target, colour, onCaptured }: { slot: Slot; target: AimPoint; colour: string; onCaptured(q: Quat): void }) {
  const session = useController();
  const ringRef = useRef<SVGCircleElement>(null);
  const [holding, setHolding] = useState(false);
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
        setHolding(reading.progress > 0.05);
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

  const half = { x: TV.x + (slot === 1 ? 0 : TV.w / 2), w: TV.w / 2 };
  const at = { x: half.x + ((target.x + 1) / 2) * half.w, y: TV.y + ((1 - target.y) / 2) * TV.h };

  return (
    <div className={`target-capture ${holding ? "target-capture--holding" : ""}`}>
      <svg className="target-capture__tv" viewBox="0 0 320 200" role="img" aria-label="Where to point on the big screen">
        <rect x={TV.x - 4} y={TV.y - 4} width={TV.w + 8} height={TV.h + 8} rx="10" className="target-capture__frame" />
        <rect x={TV.x} y={TV.y} width={TV.w} height={TV.h} rx="5" className="target-capture__screen" />
        <rect x={half.x} y={TV.y} width={half.w} height={TV.h} rx="5" className="target-capture__half" style={{ fill: colour }} />
        <path d={`M${TV.x + TV.w / 2} ${TV.y}V${TV.y + TV.h}`} className="target-capture__split" />
        <circle cx={at.x} cy={at.y} r="17" className="target-capture__track" />
        <circle
          ref={ringRef}
          cx={at.x}
          cy={at.y}
          r="17"
          className="target-capture__progress"
          strokeDasharray={RING}
          strokeDashoffset={RING}
          transform={`rotate(-90 ${at.x} ${at.y})`}
        />
        <circle cx={at.x} cy={at.y} r="6" className="target-capture__dot" style={{ fill: colour }} />
      </svg>
      <p className="target-capture__hint" role="status" aria-live="polite">
        {holding ? "Hold it there" : "Point and hold still"}
      </p>
      {offer && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => session.pipeline.rawOrientation && doneRef.current(session.pipeline.rawOrientation)}>
          Use where I point now
        </button>
      )}
    </div>
  );
}
