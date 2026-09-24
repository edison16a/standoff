"use client";
import { useState } from "react";
import { useControllerStore } from "../controller-store";
import { Level } from "./Level";
import { useController } from "./session-context";
import { SteerGauge } from "./SteerGauge";

/** The phone lying flat and sideways, with arrows for the tilt that steers. */
function TrayGuide() {
  return (
    <svg className="mk-tray" viewBox="0 0 200 90" role="img" aria-label="Phone held sideways and flat, tilt left and right to steer">
      <path d="M40 50 70 30h92l-30 20z" className="mk-tray__phone" />
      <path d="M40 50v6h92l30-20v-6" className="mk-tray__edge" />
      <path d="M22 70q-10-22 8-40M178 70q10-22-8-40" className="mk-tray__arrow" />
      <path d="M24 24l6 6 2-8M176 24l-6 6-2-8" className="mk-tray__arrow" />
    </svg>
  );
}

/**
 * Step one: turn the phone sideways, lay it flat until the level lights
 * up, then Calibrate. That flat pose becomes straight ahead. Afterwards a
 * wheel on screen turns with the tilt so the player can try it.
 */
export function CalibrateStep() {
  const session = useController();
  const { sensorsLive, calibrated, steerMode } = useControllerStore();
  const [flat, setFlat] = useState(false);

  if (steerMode === "buttons") {
    return (
      <div className="mk-setup">
        <p className="mk-setup__lead">This phone has no tilt sensor, so you steer with arrow buttons on screen.</p>
      </div>
    );
  }

  return (
    <div className="mk-setup mk-setup--split">
      <div className="mk-setup__visual">{sensorsLive ? <Level onFlat={setFlat} /> : <TrayGuide />}</div>
      <div className="mk-setup__text">
        <p className="mk-setup__lead">Hold your phone sideways and lay it flat, screen up.</p>
        {sensorsLive && !calibrated && <p className="muted">{flat ? "Flat. Now tap Calibrate." : "Level it until the bubble sits between the lines."}</p>}
        {calibrated && (
          <>
            <p className="muted">Tilt left and right to steer. The wheel follows.</p>
            <SteerGauge className="mk-gauge--small" />
          </>
        )}
        {!sensorsLive && <p className="muted">Waiting for the tilt sensor.</p>}
        <div className="mk-setup__actions">
          <button type="button" className={`btn btn--block ${calibrated ? "btn--ghost" : "btn--primary"}`} disabled={!sensorsLive} onClick={() => session.calibrate()}>
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
