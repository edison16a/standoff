"use client";
import { lazy, Suspense } from "react";
import { CHARACTER_IDS, CHARACTERS, type Stats } from "../../roster";
import { TEAMS } from "../../teams";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

// three.js loads only when the picker is first shown.
const Preview = lazy(() => import("./PreviewCanvas"));

const STATS: { key: keyof Stats; label: string }[] = [
  { key: "speed", label: "Speed" },
  { key: "agility", label: "Agility" },
  { key: "power", label: "Power" },
  { key: "hands", label: "Hands" },
  { key: "arm", label: "Arm" },
  { key: "leg", label: "Leg" },
];

/** One stat out of ten as a bar, coloured by how good it is. */
function StatBar({ label, value }: { label: string; value: number }) {
  const tier = value >= 9 ? "top" : value >= 7 ? "good" : "fair";
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
 * Step one: choose a star. The chosen one turns in 3D in their side's
 * uniform with their stats; stars other players have are marked taken.
 */
export function PickStep() {
  const phone = usePhone();
  const wanted = usePhoneStore((s) => s.wanted);
  const host = usePhoneStore((s) => s.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? CHARACTER_IDS.find((id) => !taken.includes(id)) ?? "reed";
  const star = CHARACTERS[shown];
  const team = host?.team ?? 0;

  return (
    <div className="fb-pick">
      <div className="fb-pick__stage" style={{ "--kit": TEAMS[team].color } as React.CSSProperties}>
        <Suspense fallback={null}>
          <Preview character={shown} team={team} />
        </Suspense>
        <div className="fb-pick__caption">
          <strong>{star.name}</strong>
          <span>
            {star.position}. {star.blurb}
          </span>
        </div>
      </div>
      <div className="fb-pick__side">
        <div className="fb-pick__stats">
          {STATS.map((s) => (
            <StatBar key={s.key} label={s.label} value={star.stats[s.key]} />
          ))}
        </div>
        <div className="fb-pick__list">
          {CHARACTER_IDS.map((id) => {
            const c = CHARACTERS[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`fb-pick__card ${wanted === id ? "fb-pick__card--on" : ""}`}
                disabled={busy}
                aria-pressed={wanted === id}
                aria-label={busy ? `${c.name}, taken` : c.name}
                onClick={() => phone.pick(id)}
              >
                <span className="fb-pick__number">{c.number}</span>
                <span className="fb-pick__name">{c.short}</span>
                {busy && <span className="fb-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
