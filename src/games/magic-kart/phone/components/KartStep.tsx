"use client";
import { lazy, Suspense } from "react";
import { CHARACTER_IDS, CHARACTERS, statPips } from "../../characters";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";

// three.js loads only when the picker is first shown, which keeps the game's first download small.
const Preview = lazy(() => import("./KartPreviewCanvas"));

function Stat({ label, value }: { label: string; value: number }) {
  const pips = statPips(value);
  return (
    <div className="mk-stat">
      <span className="mk-stat__label">{label}</span>
      <span className="mk-stat__pips" aria-label={`${pips} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={`mk-stat__pip ${i <= pips ? "mk-stat__pip--on" : ""}`} />
        ))}
      </span>
    </div>
  );
}

/**
 * Step two: choose a driver. Each has a kart of their own, shown turning
 * in 3D with its stats. A driver another player has is marked taken.
 */
export function KartStep() {
  const session = useController();
  const wanted = useControllerStore((state) => state.wanted);
  const host = useControllerStore((state) => state.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? CHARACTER_IDS.find((id) => !taken.includes(id)) ?? "blaze";
  const character = CHARACTERS[shown];

  return (
    <div className="mk-pick">
      <div className="mk-pick__stage" style={{ "--kart": character.color } as React.CSSProperties}>
        <Suspense fallback={null}>
          <Preview character={shown} />
        </Suspense>
        <div className="mk-pick__caption">
          <strong>{character.name}</strong>
          <span>
            {character.title}, {character.kart}
          </span>
        </div>
      </div>
      <div className="mk-pick__side">
        <div className="mk-pick__list">
          {CHARACTER_IDS.map((id) => {
            const c = CHARACTERS[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`mk-pick__card ${wanted === id ? "mk-pick__card--on" : ""}`}
                style={{ "--kart": c.color } as React.CSSProperties}
                disabled={busy}
                aria-pressed={wanted === id}
                onClick={() => session.pick(id)}
              >
                <span className="mk-pick__swatch" />
                <span className="mk-pick__name">{c.name}</span>
                {busy && <span className="mk-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
        <div className="mk-pick__stats">
          <Stat label="Speed" value={character.stats.speed} />
          <Stat label="Launch" value={character.stats.accel} />
          <Stat label="Turning" value={character.stats.handling} />
          <Stat label="Weight" value={character.stats.weight} />
        </div>
      </div>
    </div>
  );
}
