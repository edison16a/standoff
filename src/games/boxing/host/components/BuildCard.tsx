"use client";
import type { CSSProperties } from "react";
import type { Build, BuildBars } from "../../engine/builds";
import { boxerLook } from "../../render/models/looks";

const BARS: readonly [keyof BuildBars, string][] = [
  ["power", "Power"],
  ["speed", "Speed"],
  ["reach", "Reach"],
  ["defence", "Defence"],
  ["stamina", "Stamina"],
];

/** Five bars, each filled from 1 to 5 pips. The same numbers the fight uses. */
export function StatBars({ bars }: { bars: BuildBars }) {
  return (
    <dl className="bx-stats">
      {BARS.map(([key, label]) => (
        <div key={key} className="bx-stats__row">
          <dt>{label}</dt>
          <dd aria-label={`${bars[key]} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= bars[key] ? "bx-stats__pip bx-stats__pip--on" : "bx-stats__pip"} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface BuildCardProps {
  build: Build;
  on: boolean;
  locked: boolean;
  /** How far the guard hold has filled, 0 to 1. */
  holding: number;
  onChoose(): void;
}

/** One build to pick: its kit colours, its name and line, and its stat bars. */
export function BuildCard({ build, on, locked, holding, onChoose }: BuildCardProps) {
  const kit = boxerLook(build.id, "");
  const style = { ["--trunks" as string]: kit.trunks, ["--gloves" as string]: kit.gloves, ["--trim" as string]: kit.trim } as CSSProperties;
  return (
    <button type="button" className={`bx-card${on ? " bx-card--on" : ""}${on && locked ? " bx-card--locked" : ""}`} disabled={locked} onClick={onChoose} style={style}>
      <span className="bx-card__stripe" aria-hidden="true" />
      <span className="bx-card__text">
        <span className="bx-card__nick">{build.name}</span>
        <span className="bx-card__blurb">{build.blurb}</span>
      </span>
      <StatBars bars={build.bars} />
      {on && !locked && holding > 0 && <span className="bx-card__hold" style={{ width: `${Math.round(holding * 100)}%` }} />}
    </button>
  );
}
