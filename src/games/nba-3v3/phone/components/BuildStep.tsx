"use client";
import { lazy, Suspense, type CSSProperties } from "react";
import { BUILD_IDS, BUILDS, type BuildSpec } from "../../builds";
import { STAT_IDS, STAT_LABELS, statShare } from "../../roster";
import { JerseyBadge } from "../../ui/JerseyBadge";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";

// three.js loads only when the picker is first shown, which keeps the first download small.
const Preview = lazy(() => import("./PreviewCanvas"));

/** The five ratings as bars, the ones the build is made around lit brighter. */
function StatBars({ build }: { build: BuildSpec }) {
  return (
    <div className="nba-pick__stats">
      {STAT_IDS.map((id) => {
        const value = build.stats[id];
        const key = build.key.includes(id);
        return (
          <div key={id} className={`nba-stat ${key ? "nba-stat--key" : ""}`}>
            <span className="nba-stat__label">{STAT_LABELS[id]}</span>
            <span className="nba-stat__bar" role="meter" aria-label={STAT_LABELS[id]} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value}>
              <span className="nba-stat__fill" style={{ "--share": statShare(value) } as CSSProperties} />
            </span>
            <span className="nba-stat__value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Pick your build: six ways to play as cards, the chosen one turning in
 * 3D with its stat bars and play style. A build another phone has is
 * marked taken, so the six on the court always differ.
 */
export function BuildStep() {
  const session = useController();
  const wanted = useControllerStore((s) => s.wanted);
  const host = useControllerStore((s) => s.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? BUILD_IDS.find((id) => !taken.includes(id)) ?? "shooter";
  const b = BUILDS[shown];

  return (
    <div className="nba-pick">
      <div className="nba-pick__stage">
        <Suspense fallback={null}>
          <Preview build={shown} team={host?.team ?? null} />
        </Suspense>
        <div className="nba-pick__caption">
          <strong>{b.name}</strong>
          <span>Dunk: {b.dunkName.toLowerCase()}</span>
        </div>
      </div>
      <div className="nba-pick__side">
        <StatBars build={b} />
        <p className="nba-pick__blurb">{b.style}</p>
        <div className="nba-pick__list" role="group" aria-label="Builds">
          {BUILD_IDS.map((id) => {
            const card = BUILDS[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`nba-pick__card ${wanted === id ? "nba-pick__card--on" : ""}`}
                disabled={busy}
                aria-pressed={wanted === id}
                aria-label={busy ? `${card.name}, taken` : card.name}
                onClick={() => session.pick(id)}
              >
                <JerseyBadge build={id} team={host?.team ?? null} size={40} />
                <span className="nba-pick__name">{card.name}</span>
                {busy && <span className="nba-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
