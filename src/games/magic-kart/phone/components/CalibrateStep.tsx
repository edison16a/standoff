"use client";
import { useState } from "react";
import { useControllerStore } from "../controller-store";
import { usePortrait } from "../use-portrait";
import { Level, type Hold } from "./Level";
import { useController } from "./session-context";
import { SteerGauge } from "./SteerGauge";

const HINTS: Record<Hold, string> = {
  level: "Level. Now tap Calibrate.",
  turned: "Turn it until the bubble sits between the lines.",
  flat: "Stand it up, screen facing you. Lying flat will not calibrate.",
};

/** A phone with rotation lock on keeps the page upright however it is held, and the wheel cannot be read. */
export const ROTATION_LOCK = "If the page does not turn with it, switch off rotation lock.";

/**
 * Step one: hold the phone sideways and upright like a steering wheel,
 * turn it until the level lights up, then Calibrate. That pose becomes
 * straight ahead. Afterwards a wheel on screen turns with the phone so
 * the player can try it.
 */
export function CalibrateStep() {
  const session = useController();
  const { sensorsLive, calibrated, steerMode } = useControllerStore();
  const [hold, setHold] = useState<Hold>("turned");
  // Held upright the page would read the wheel a quarter turn out, so calibrating waits for sideways.
  const portrait = usePortrait();

  if (steerMode === "buttons") {
    return (
      <div className="mk-setup">
        <p className="mk-setup__lead">This phone has no tilt sensor, so you steer with arrow buttons on screen.</p>
      </div>
    );
  }

  const hint = portrait ? `Turn your phone sideways first. ${ROTATION_LOCK}` :calibrated && hold !== "flat" ? "Turn it like a wheel to steer. The wheel follows." : HINTS[hold];
  return (
    <div className="mk-setup mk-setup--split">
      <div className="mk-setup__visual">
        <Level onHold={setHold} />
      </div>
      <div className="mk-setup__text">
        <p className="mk-setup__lead">Hold your phone sideways and upright, screen facing you, like a steering wheel.</p>
        {sensorsLive && <p className="muted">{hint}</p>}
        {sensorsLive && calibrated && !portrait && <SteerGauge className="mk-gauge--small" />}
        {!sensorsLive && <p className="muted">Waiting for the tilt sensor.</p>}
        <div className="mk-setup__actions">
          <button
            type="button"
            className={`btn btn--block ${calibrated ? "btn--ghost" : "btn--primary"}`}
            // Lying flat is not how the wheel is held, so straight ahead is never taken from it.
            disabled={!sensorsLive || portrait || hold === "flat"}
            onClick={() => session.calibrate()}
          >
            {calibrated ? "Calibrate again" : "Calibrate"}
          </button>
          {!sensorsLive && (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => session.useButtons()}>
              Steer with buttons
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
