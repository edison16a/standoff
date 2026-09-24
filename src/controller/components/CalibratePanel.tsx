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

  if (inputMode === "touch") return <p className="muted">On screen buttons</p>;

  return (
    <div className="calibrate">
      <p className="muted">Point the top of your phone at the screen.</p>
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
            Use buttons instead
          </button>
        )}
      </div>
    </div>
  );
}
