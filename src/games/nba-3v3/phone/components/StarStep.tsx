"use client";
import { lazy, Suspense } from "react";
import { CHARACTER_IDS, CHARACTERS, statPips } from "../../roster";
import { JerseyBadge } from "../../ui/JerseyBadge";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";

// three.js loads only when the picker is first shown, which keeps the first download small.
const Preview = lazy(() => import("./PreviewCanvas"));

function Stat({ label, value }: { label: string; value: number }) {
  const pips = statPips(value);
  return (
    <div className="nba-stat">
      <span className="nba-stat__label">{label}</span>
      <span className="nba-stat__bar" aria-label={`${pips} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`nba-stat__pip ${i <= pips ? "nba-stat__pip--on" : ""}`} />
        ))}
      </span>
    </div>
  );
}

/**
 * Pick your star: the ten players as cards, the chosen one turning in
 * 3D with their stats and signature dunk. One taken by another phone is
 * marked and cannot be picked.
 */
export function StarStep() {
  const session = useController();
  const wanted = useControllerStore((s) => s.wanted);
  const host = useControllerStore((s) => s.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? CHARACTER_IDS.find((id) => !taken.includes(id)) ?? "curry";
  const c = CHARACTERS[shown];

  return (
    <div className="nba-pick">
      <div className="nba-pick__stage">
        <Suspense fallback={null}>
          <Preview character={shown} team={host?.team ?? null} />
        </Suspense>
        <div className="nba-pick__caption">
          <strong>{c.name}</strong>
          <span>
            #{c.number}, {c.position}
          </span>
        </div>
      </div>
      <div className="nba-pick__side">
        <div className="nba-pick__stats">
          <Stat label="Speed" value={c.stats.speed} />
          <Stat label="Shooting" value={c.stats.shooting} />
          <Stat label="Strength" value={c.stats.strength} />
          <p className="nba-pick__blurb">
            {c.blurb} Dunk: {c.dunkName.toLowerCase()}.
          </p>
        </div>
        <div className="nba-pick__list" role="group" aria-label="Stars">
          {CHARACTER_IDS.map((id) => {
            const star = CHARACTERS[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`nba-pick__card ${wanted === id ? "nba-pick__card--on" : ""}`}
                disabled={busy}
                aria-pressed={wanted === id}
                aria-label={busy ? `${star.name}, taken` : star.name}
                onClick={() => session.pick(id)}
              >
                <JerseyBadge character={id} team={host?.team ?? null} size={40} />
                <span className="nba-pick__name">{star.short}</span>
                {busy && <span className="nba-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
