"use client";
import { Icon } from "@/components/ui/Icon";
import { useControllerStore } from "../controller-store";
import { MoveMeter, SwordGauge } from "./Gauges";
import { useController } from "./session-context";

/**
 * Sets the guard pose. The player points the phone at the screen the way
 * they will hold it, and that becomes "blade level, facing the opponent".
 */
export function CalibratePanel() {
  const session = useController();
  const calibrated = useControllerStore((state) => state.calibrated);
  const sensorsLive = useControllerStore((state) => state.sensorsLive);
  const inputMode = useControllerStore((state) => state.inputMode);

  if (inputMode === "touch") {
    return <p className="muted">This device has no motion sensors, so you will play with on screen buttons.</p>;
  }

  return (
    <div className="calibrate">
      <p className="muted">
        Grip the phone like a sword handle, screen up, and point its top edge at the computer screen. Then tap
        Calibrate. Recalibrate any time it feels off.
      </p>
      {calibrated && (
        <div className="calibrate__live">
          <SwordGauge />
          <MoveMeter />
        </div>
      )}
      <div className="calibrate__actions">
        <button type="button" className="btn btn--block" onClick={() => session.calibrate()} disabled={!sensorsLive}>
          <Icon name="target" />
          {calibrated ? "Recalibrate" : "Calibrate"}
        </button>
        {!sensorsLive && (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => session.useTouchControls()}>
            No motion? Use on screen buttons
          </button>
        )}
      </div>
    </div>
  );
}
