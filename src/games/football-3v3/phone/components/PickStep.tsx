"use client";
import { lazy, Suspense } from "react";
import { BEST_AT, BUILD_IDS, BUILDS, STAT_IDS, STAT_NAMES } from "../../builds";
import { TEAMS } from "../../teams";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

// three.js loads only when the picker is first shown.
const Preview = lazy(() => import("./PreviewCanvas"));

/** One rating out of ten as a bar, coloured by how good it is. */
function StatBar({ label, value }: { label: string; value: number }) {
  const tier = value >= 9 ? "top" : value >= 7 ? "good" : value <= 3 ? "low" : "fair";
  return (
    <div className={`fb-stat fb-stat--${tier}`}>
      <span className="fb-stat__label">{label}</span>
      <span className="fb-stat__bar">
        <span style={{ width: `${value * 10}%` }} />
      </span>
      <strong className="fb-stat__value">{value}</strong>
    </div>
  );
}

/**
 * Step one: choose a build, a way to play. The chosen one turns in 3D
 * in the side's uniform, with what it is best at, how it plays and its
 * ratings; builds other players have are marked taken.
 */
export function PickStep() {
  const phone = usePhone();
  const wanted = usePhoneStore((s) => s.wanted);
  const host = usePhoneStore((s) => s.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? BUILD_IDS.find((id) => !taken.includes(id)) ?? "gunslinger";
  const build = BUILDS[shown];
  const team = host?.team ?? 0;

  return (
    <div className="fb-pick">
      <div className="fb-pick__stage" style={{ "--kit": TEAMS[team].color } as React.CSSProperties}>
        <Suspense fallback={null}>
          <Preview build={shown} team={team} />
        </Suspense>
        <div className="fb-pick__caption">
          <span className="fb-pick__best">Best at {BEST_AT[build.best].toLowerCase()}</span>
          <strong>{build.name}</strong>
          <span className="fb-pick__style">{build.style}</span>
        </div>
      </div>
      <div className="fb-pick__side">
        <div className="fb-pick__stats">
          {STAT_IDS.map((id) => (
            <StatBar key={id} label={STAT_NAMES[id]} value={build.stats[id]} />
          ))}
        </div>
        <div className="fb-pick__list">
          {BUILD_IDS.map((id) => {
            const b = BUILDS[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`fb-pick__card ${wanted === id ? "fb-pick__card--on" : ""}`}
                disabled={busy}
                aria-pressed={wanted === id}
                aria-label={busy ? `${b.name}, taken` : b.name}
                onClick={() => phone.pick(id)}
              >
                <span className="fb-pick__number">{b.number}</span>
                <span className="fb-pick__name">{b.short}</span>
                {busy && <span className="fb-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
