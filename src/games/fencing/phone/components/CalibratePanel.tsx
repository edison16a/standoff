"use client";
import { useEffect, useState } from "react";
import { FencerCanvas } from "@/games/fencing/components/FencerCanvas";
import type { Slot } from "@/games/fencing/players";
import { useControllerStore } from "../controller-store";
import { HoldGuide } from "./HoldGuide";
import { Level } from "./Level";
import { useController } from "./session-context";

/** Seconds to get into position after tapping, so the tap itself never moves the guard. */
const COUNTDOWN = 3;

/**
 * Sets the guard. The drawing shows the grip and where to point, and the
 * level shows when the phone is flat, so the guard is easy to find again.
 * Tap, hold still through the count, and the pose is captured. Afterwards
 * the fencer here holds its sword wherever the phone points.
 */
export function CalibratePanel({ slot }: { slot: Slot }) {
  const session = useController();
  const { calibrated, sensorsLive, inputMode, pick } = useControllerStore();
  const [count, setCount] = useState<number | null>(null);
  const [level, setLevel] = useState(false);

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
        <Level onLevel={setLevel} />
        <strong className="calibrate__count">{count}</strong>
        <p>{level ? "Hold still" : "Keep it level, pointing at the middle of the screen"}</p>
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
      <p className="calibrate__lead">Point the top of your phone at the middle of the screen.</p>
      {sensorsLive && <Level onLevel={setLevel} />}
      {sensorsLive && <p className="muted">{level ? "Level. Now tap Calibrate." : "Hold it flat until the dot sits in the circle."}</p>}
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
