"use client";
import { lazy, Suspense } from "react";
import { ATTRIBUTE_LABELS, ATTRIBUTE_PAIRS, type AttributeId } from "../../attributes";
import { BUILD_IDS, BUILDS, type Build } from "../../builds";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

// three.js loads only when the picker is first shown.
const Preview = lazy(() => import("./PreviewCanvas"));

/** One rating as a bar and a number, coloured by how good it is. The build's own two stand out. */
function StatBar({ id, value, lead }: { id: AttributeId; value: number; lead: boolean }) {
  const tier = value >= 90 ? "top" : value >= 78 ? "good" : "fair";
  return (
    <div className={`fifa-stat fifa-stat--${tier} ${lead ? "fifa-stat--lead" : ""}`}>
      <span className="fifa-stat__label">{ATTRIBUTE_LABELS[id]}</span>
      <span className="fifa-stat__bar">
        <span style={{ width: `${Math.max(6, ((value - 45) / 54) * 100)}%` }} />
      </span>
      <strong className="fifa-stat__value">{value}</strong>
    </div>
  );
}

/** All ten ratings, in the pairs the builds are made around: one row per specialist. */
export function BuildStats({ build }: { build: Build }) {
  return (
    <div className="fifa-pick__stats" aria-label={`${build.name} ratings`}>
      {ATTRIBUTE_PAIRS.flat().map((id) => (
        <StatBar key={id} id={id} value={build.ratings[id]} lead={build.key.includes(id)} />
      ))}
    </div>
  );
}

/**
 * Step one: choose a build. It turns in 3D with the player's own name
 * on the back, beside its ratings and how it plays. Builds another
 * player has are marked taken.
 */
export function PickStep() {
  const phone = usePhone();
  const wanted = usePhoneStore((s) => s.wanted);
  const host = usePhoneStore((s) => s.host);
  const taken = host?.taken ?? [];
  const shown = wanted ?? BUILD_IDS.find((id) => !taken.includes(id)) ?? "allrounder";
  const build = BUILDS[shown];

  return (
    <div className="fifa-pick">
      <div className="fifa-pick__stage" style={{ "--kit": build.look.kit.shirt } as React.CSSProperties}>
        <Suspense fallback={null}>
          <Preview build={shown} name={host?.name ?? ""} />
        </Suspense>
        <div className="fifa-pick__caption">
          <strong>{build.name}</strong>
          <span>{build.style}</span>
        </div>
      </div>
      <div className="fifa-pick__side">
        <BuildStats build={build} />
        <div className="fifa-pick__list">
          {BUILD_IDS.map((id) => {
            const b = BUILDS[id];
            const busy = taken.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`fifa-pick__card ${wanted === id ? "fifa-pick__card--on" : ""}`}
                style={{ "--kit": b.look.kit.shirt, "--ink": b.look.kit.ink } as React.CSSProperties}
                disabled={busy}
                aria-pressed={wanted === id}
                aria-label={busy ? `${b.name}, taken` : b.name}
                onClick={() => phone.pick(id)}
              >
                <span className="fifa-pick__number">{b.number}</span>
                <span className="fifa-pick__name">{b.name}</span>
                {busy && <span className="fifa-pick__taken">Taken</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
