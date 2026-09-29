"use client";
import { useCallback, useEffect, useState } from "react";
import { useControllerStore } from "../controller-store";
import { usePortrait } from "../use-portrait";
import { Level, type Hold } from "./Level";
import { useController } from "./session-context";

/** How long the level shows green before the next step comes up. */
const GREEN_MS = 700;

const HINTS: Record<Hold, string> = {
  level: "Hold it there.",
  turned: "Align the dot in the middle.",
  flat: "Stand it up, screen facing you. Lying flat will not calibrate.",
};

/** A phone with rotation lock on keeps the page upright however it is held, and the wheel cannot be read. */
export const ROTATION_LOCK = "If the page does not turn with it, switch off rotation lock.";

/**
 * Step one: hold the phone sideways and upright like a steering wheel,
 * and align the level's dot in the middle. Holding it there for a second
 * fills the bar and turns it green: that pose becomes straight ahead, and
 * the next step comes up by itself. No button to tap, so a tap can never
 * tip the wheel as it is read.
 */
export function CalibrateStep() {
  const session = useController();
  const { sensorsLive, steerMode } = useControllerStore();
  const [hold, setHold] = useState<Hold>("turned");
  const [done, setDone] = useState(false);
  // Held upright the page would read the wheel a quarter turn out, so calibrating waits for sideways.
  const portrait = usePortrait();

  const held = useCallback(() => {
    session.calibrate();
    navigator.vibrate?.(40);
    setDone(true);
  }, [session]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => session.goTo("kart"), GREEN_MS);
    return () => clearTimeout(timer);
  }, [done, session]);

  if (steerMode === "buttons") {
    return (
      <div className="mk-setup">
        <p className="mk-setup__lead">This phone has no tilt sensor, so you steer with arrow buttons on screen.</p>
      </div>
    );
  }

  const hint = done ? "Straight ahead is set." : portrait ? `Turn your phone sideways first. ${ROTATION_LOCK}` : HINTS[hold];
  return (
    <div className="mk-setup mk-setup--split">
      <div className="mk-setup__visual">
        <Level onHold={setHold} armed={sensorsLive && !portrait} onHeld={held} done={done} />
      </div>
      <div className="mk-setup__text">
        <p className="mk-setup__lead">Hold your phone sideways and upright, screen facing you, like a steering wheel.</p>
        {sensorsLive && (
          <p className={`muted mk-hold-note ${done ? "mk-hold-note--done" : ""}`} role="status" aria-live="polite">
            {hint}
          </p>
        )}
        {sensorsLive && !done && <p className="muted">Hold the dot between the lines for a second. It turns green and moves on.</p>}
        {!sensorsLive && (
          <div className="mk-setup__actions">
            <p className="muted">Waiting for the tilt sensor.</p>
            <button type="button" className="btn btn--ghost btn--block" onClick={() => session.useButtons()}>
              Steer with buttons
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
