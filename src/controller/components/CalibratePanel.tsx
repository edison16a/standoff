"use client";
import { useEffect, useState } from "react";
import { FencerCanvas } from "@/components/game/FencerCanvas";
import type { Slot } from "@/shared/players";
import { useControllerStore } from "../controller-store";
import { HoldGuide } from "./HoldGuide";
import { useController } from "./session-context";

/** Seconds to get into position after tapping, so the tap itself never moves the guard. */
const COUNTDOWN = 3;

/**
 * Sets the guard. Tap, get into position, hold still, and the pose is
 * captured when the count runs out. Afterwards the fencer on screen holds
 * its sword wherever the phone points, so it is obvious it worked.
 */
export function CalibratePanel({ slot }: { slot: Slot }) {
  const session = useController();
  const { calibrated, sensorsLive, inputMode, pick } = useControllerStore();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (count === null) return;
    const timer = setTimeout(() => {
      if (count > 1) return setCount(count - 1);
      session.calibrate();
      setCount(null);
    }, 1000);
    return () => clearTimeout(timer);
  }, [count, session]);

  if (inputMode === "touch") return <p className="muted">On screen buttons</p>;

  if (count !== null) {
    return (
      <div className="calibrate calibrate--counting">
        <strong className="calibrate__count">{count}</strong>
        <p>Point at the screen and hold still</p>
      </div>
    );
  }

  if (calibrated) {
    return (
      <div className="calibrate">
        <FencerCanvas characterId={pick ?? "vale"} slot={slot} className="calibrate__preview" sword={() => session.frame} />
        <p className="muted">Tilt the phone. The sword follows.</p>
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setCount(COUNTDOWN)}>
          Calibrate again
        </button>
      </div>
    );
  }

  return (
    <div className="calibrate">
      <HoldGuide />
      <p>Hold it like a sword, pointing at the screen.</p>
      <button type="button" className="btn btn--primary btn--block" onClick={() => setCount(COUNTDOWN)} disabled={!sensorsLive}>
        Calibrate
      </button>
      {!sensorsLive && (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => session.useTouchControls()}>
          Use buttons instead
        </button>
      )}
    </div>
  );
}
