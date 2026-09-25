"use client";
import { useEffect, useRef, useState } from "react";
import { SteadyLevel } from "@/games/blade-clash/phone/steady-level";
import { useController } from "../session-context";

/** Tilt that pushes the bubble to the rim. */
const FULL_TILT = (25 * Math.PI) / 180;
const RIM = 68;
/** The progress ring's circumference, for its dash. */
const RING = 2 * Math.PI * 92;
/** After this long without a capture, offer to take the pose as it is. */
const OFFER_ANYWAY_MS = 9000;

type Hint = "tilt" | "still" | "holding" | "done";

const HINTS: Record<Hint, string> = {
  tilt: "Tilt until the dot sits in the middle",
  still: "Level. Now hold still",
  holding: "Hold it there",
  done: "Got it",
};

/**
 * A bubble level that captures the guard by itself. Tilt the phone until
 * the bubble is in the middle and hold still: the ring fills, and when it
 * closes the guard is taken, with a buzz and a chime. Nothing to tap, so
 * no tap can nudge the phone at the last moment.
 */
export function LevelCapture({ onCaptured }: { onCaptured(): void }) {
  const session = useController();
  const bubbleRef = useRef<SVGCircleElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const [hint, setHint] = useState<Hint>("tilt");
  const [offer, setOffer] = useState(false);
  const doneRef = useRef(onCaptured);
  useEffect(() => {
    doneRef.current = onCaptured;
  });

  useEffect(() => {
    const steady = new SteadyLevel();
    const started = performance.now();
    let frame = 0;
    let shown: Hint = "tilt";
    let captured = false;
    const show = (next: Hint) => {
      if (next === shown) return;
      shown = next;
      setHint(next);
    };
    const draw = (now: number) => {
      const q = session.pipeline.rawOrientation;
      if (q && !captured) {
        const reading = steady.update(q, now);
        const clamp = (v: number) => Math.max(-1, Math.min(1, v / FULL_TILT)) * RIM;
        bubbleRef.current?.setAttribute("cx", String(100 + clamp(reading.roll)));
        bubbleRef.current?.setAttribute("cy", String(100 - clamp(reading.pitch)));
        ringRef.current?.setAttribute("stroke-dashoffset", String(RING * (1 - reading.progress)));
        show(reading.progress > 0.05 ? "holding" : reading.level ? "still" : "tilt");
        if (reading.progress >= 1 && session.calibrate()) {
          captured = true;
          show("done");
          setTimeout(() => doneRef.current(), 650);
        }
      }
      if (now - started > OFFER_ANYWAY_MS) setOffer(true);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return (
    <div className={`level-capture level-capture--${hint}`}>
      <svg className="level-capture__dial" viewBox="0 0 200 200" role="img" aria-label={HINTS[hint]}>
        <circle cx="100" cy="100" r="92" className="level-capture__track" />
        <circle
          ref={ringRef}
          cx="100"
          cy="100"
          r="92"
          className="level-capture__progress"
          strokeDasharray={RING}
          strokeDashoffset={RING}
          transform="rotate(-90 100 100)"
        />
        <circle cx="100" cy="100" r="80" className="level-capture__face" />
        <path d="M100 26V174M26 100H174" className="level-capture__cross" />
        <circle cx="100" cy="100" r="20" className="level-capture__target" />
        <circle ref={bubbleRef} cx="100" cy="100" r="14" className="level-capture__bubble" />
        <path d="M86 101l10 10 19-22" className="level-capture__check" />
      </svg>
      <p className="level-capture__hint" role="status" aria-live="polite">
        {HINTS[hint]}
      </p>
      {offer && hint !== "done" && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => session.calibrate() && onCaptured()}>
          Use the pose I have now
        </button>
      )}
    </div>
  );
}
