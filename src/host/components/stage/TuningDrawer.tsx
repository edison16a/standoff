"use client";
import { useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Slider } from "@/components/ui/Slider";
import { Tabs } from "@/components/ui/Tabs";
import { DEFAULT_TUNING, TUNING_FIELDS, type MovementMode, type TuningGroup } from "@/shared/tuning";
import { useHostStore } from "../../host-store";
import { useSession } from "../session-context";

const GROUPS: { id: TuningGroup; label: string }[] = [
  { id: "Strikes", label: "Strikes" },
  { id: "Movement", label: "Movement" },
  { id: "Match", label: "Match" },
  { id: "Sound", label: "Sound" },
];

function format(value: number, step: number, unit: string): string {
  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
}

/**
 * Every feel value, live, in a panel that slides over the side of the
 * strip. Changes reach both phones at once. Nothing is saved.
 */
export function TuningDrawer({ onClose }: { onClose: () => void }) {
  const session = useSession();
  const tuning = useHostStore((state) => state.tuning);
  const [group, setGroup] = useState<TuningGroup>("Strikes");
  const setMode = (movementMode: MovementMode) => session.setTuning({ ...tuning, movementMode });

  return (
    <aside className="drawer" aria-label="Tuning">
      <header className="drawer__head">
        <strong>Tuning</strong>
        <IconButton icon="close" label="Close tuning" onClick={onClose} />
      </header>
      <Tabs items={GROUPS} value={group} onChange={setGroup} label="Tuning groups" />
      <div className="drawer__body">
        {group === "Movement" && (
          <div className="segmented" role="group" aria-label="Movement model">
            {(["position", "tilt"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={tuning.movementMode === mode} onClick={() => setMode(mode)}>
                {mode === "position" ? "Position" : "Tilt"}
              </button>
            ))}
          </div>
        )}
        {TUNING_FIELDS.filter((field) => field.group === group).map((field) => (
          <label key={field.key} className="drawer__field">
            <span className="drawer__name">
              {field.label}
              <span className="mono muted">{format(tuning[field.key], field.step, field.unit)}</span>
            </span>
            <Slider
              min={field.min}
              max={field.max}
              step={field.step}
              value={tuning[field.key]}
              onChange={(value) => session.setTuning({ ...tuning, [field.key]: value })}
            />
          </label>
        ))}
      </div>
      <footer className="drawer__foot">
        <button type="button" className="btn btn--ghost" onClick={() => session.setTuning(DEFAULT_TUNING)}>
          Reset
        </button>
      </footer>
    </aside>
  );
}
