"use client";
import type { Build, BuildStats } from "../../engine/builds";
import { BODIES } from "../../render/models/looks";

const BARS: readonly [keyof BuildStats, string][] = [
  ["power", "Power"],
  ["speed", "Speed"],
  ["reach", "Reach"],
  ["defense", "Defense"],
  ["stamina", "Stamina"],
];

interface Props {
  build: Build;
  mine: boolean;
  locked: boolean;
  /** How far the guard hold has filled toward locking in, 0 to 1. */
  holding: number;
  /** Taken by the other player. */
  taken: boolean;
  onChoose: () => void;
}

/** One build to choose: its name, what it does, and a bar for each stat out of five. */
export function BuildCard({ build, mine, locked, holding, taken, onChoose }: Props) {
  const body = BODIES[build.id];
  return (
    <button
      type="button"
      className={`bx-card${mine ? " bx-card--on" : ""}${mine && locked ? " bx-card--locked" : ""}`}
      disabled={locked || taken}
      onClick={onChoose}
      style={{ ["--trunks" as string]: body.trunks, ["--gloves" as string]: body.gloves, ["--trim" as string]: body.trim }}
    >
      <span className="bx-card__stripe" aria-hidden="true" />
      <span className="bx-card__name">{build.name}</span>
      <span className="bx-card__from">{build.blurb}</span>
      <span className="bx-card__stats">
        {BARS.map(([key, label]) => (
          <span key={key} className="bx-stat">
            <span className="bx-stat__label">{label}</span>
            <span className="bx-stat__bar" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={build.stats[key]}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`bx-stat__pip${n <= build.stats[key] ? " bx-stat__pip--on" : ""}`} />
              ))}
            </span>
          </span>
        ))}
      </span>
      {mine && !locked && holding > 0 && <span className="bx-card__hold" style={{ width: `${Math.round(holding * 100)}%` }} />}
    </button>
  );
}
