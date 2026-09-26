"use client";
import { lazy, Suspense } from "react";
import { CHARACTER_IDS, ROSTER, type Stats } from "../../roster";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

// three.js loads only when the picker is first shown.
const Preview = lazy(() => import("./PreviewCanvas"));

const STATS: { key: keyof Stats; label: string }[] = [
  { key: "speed", label: "Speed" },
  { key: "shooting", label: "Shooting" },
  { key: "strength", label: "Strength" },
  { key: "dribbling", label: "Dribbling" },
];

/** One stat as a number and a bar, coloured by how good it is. */
function StatBar({ label, value }: { label: string; value: number }) {
  const tier = value >= 90 ? "top" : value >= 80 ? "good" : "fair";
  return (
    <div className={`fifa-stat fifa-stat--${tier}`}>
      <span className="fifa-stat__label">{label}</span>
      <span className="fifa-stat__bar">
        <span style={{ width: `${Math.max(8, ((value - 50) / 49) * 100)}%` }} />
      </span>
      <strong className="fifa-stat__value">{value}</strong>
    </div>
  );
}

/**
 * Step one: choose a star. The chosen one turns in 3D in their own kit
 * with their stats; stars other players have are marked taken.
 */
export function PickStep() {
  const phone = usePhone();
  const wanted = usePhoneStore((s) => s.wanted);
  const host = usePhoneStore((s) => s.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? CHARACTER_IDS.find((id) => !taken.includes(id)) ?? "echeverri";
  const star = ROSTER[shown];

  return (
    <div className="fifa-pick">
      <div className="fifa-pick__stage" style={{ "--kit": star.look.kit.shirt } as React.CSSProperties}>
        <Suspense fallback={null}>
          <Preview character={shown} />
        </Suspense>
        <div className="fifa-pick__caption">
          <strong>{star.name}</strong>
          <span>
            {star.role}. Celebrates with: {star.celebrationName.toLowerCase()}.
          </span>
        </div>
      </div>
      <div className="fifa-pick__side">
        <div className="fifa-pick__stats">
          {STATS.map((s) => (
            <StatBar key={s.key} label={s.label} value={star.stats[s.key]} />
          ))}
        </div>
        <div className="fifa-pick__list">
          {CHARACTER_IDS.map((id) => {
            const c = ROSTER[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`fifa-pick__card ${wanted === id ? "fifa-pick__card--on" : ""}`}
                style={{ "--kit": c.look.kit.shirt, "--ink": c.look.kit.ink } as React.CSSProperties}
                disabled={busy}
                aria-pressed={wanted === id}
                aria-label={busy ? `${c.name}, taken` : c.name}
                onClick={() => phone.pick(id)}
              >
                <span className="fifa-pick__number">{c.number}</span>
                <span className="fifa-pick__name">{c.short}</span>
                {busy && <span className="fifa-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
