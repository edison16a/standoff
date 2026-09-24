"use client";
import { Slider } from "@/components/ui/Slider";
import { DEFAULT_TUNING, TUNING_FIELDS, type MovementMode, type TuningGroup } from "@/shared/tuning";
import { useHostStore } from "../host-store";
import { useSession } from "./session-context";

const GROUPS: TuningGroup[] = ["Strikes", "Movement", "Match", "Sound"];

function format(value: number, step: number, unit: string): string {
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

/**
 * Every feel value in one place, live. Changes reach both phones at once,
 * and nothing is saved: a new game starts from the defaults again.
 */
export function TuningPanel() {
  const session = useSession();
  const tuning = useHostStore((state) => state.tuning);

  const setMode = (movementMode: MovementMode) => session.setTuning({ ...tuning, movementMode });

  return (
    <div className="tuning">
      <div className="tuning__row">
        <div>
          <strong>Movement model</strong>
          <p className="muted small">Position tracks your arm. Tilt is the drift free fallback.</p>
        </div>
        <div className="segmented" role="group" aria-label="Movement model">
          {(["position", "tilt"] as const).map((mode) => (
            <button key={mode} type="button" aria-pressed={tuning.movementMode === mode} onClick={() => setMode(mode)}>
              {mode === "position" ? "Position" : "Tilt"}
            </button>
          ))}
        </div>
      </div>
      {GROUPS.map((group) => (
        <fieldset key={group} className="tuning__group">
          <legend className="label">{group}</legend>
          {TUNING_FIELDS.filter((field) => field.group === group).map((field) => (
            <label key={field.key} className="tuning__field">
              <span className="tuning__name">{field.label}</span>
              <Slider
                min={field.min}
                max={field.max}
                step={field.step}
                value={tuning[field.key]}
                onChange={(value) => session.setTuning({ ...tuning, [field.key]: value })}
              />
              <span className="tuning__value mono">{format(tuning[field.key], field.step, field.unit)}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <button type="button" className="btn" onClick={() => session.setTuning(DEFAULT_TUNING)}>
        Reset to defaults
      </button>
    </div>
  );
}
