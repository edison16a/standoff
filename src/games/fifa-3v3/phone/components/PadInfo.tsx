"use client";
import { GUARD } from "../../engine/defence-tuning";
import type { KickState, PhoneState } from "../../protocol";
import { TEAMS } from "../../teams";

/**
 * On defence: how far away the man you mark is, against the range Guard
 * works in, so the player knows when holding it will do anything.
 */
export function GuardMeter({ host }: { host: PhoneState }) {
  const d = host.markDistance;
  if (d === null) return null;
  const inRange = d <= GUARD.range;
  const fill = Math.max(0, Math.min(1, 1 - d / (GUARD.range * 2)));
  const word = host.guard === "on" ? "Guarding" : inRange ? "In range" : "Too far";
  return (
    <div className={`fifa-guard ${inRange ? "fifa-guard--in" : ""} ${host.guard === "on" ? "fifa-guard--on" : ""}`} aria-label={`Your man is ${d} metres away. ${word}.`}>
      <div className="fifa-guard__track">
        <span className="fifa-guard__range" style={{ width: "50%" }} />
        <span className="fifa-guard__fill" style={{ width: `${fill * 100}%` }} />
      </div>
      <span className="fifa-guard__label">
        {word} <small>{d} m</small>
      </span>
    </div>
  );
}

const STEPS: Record<KickState["kind"], Partial<Record<KickState["stage"], string>>> = {
  free: {
    aim: "Aim with the stick, left or right. Tap Set.",
    curve: "Bend it with the stick. Tap Set.",
    power: "Hold Shoot, let go for the power.",
    runup: "Here it goes",
  },
  penalty: {
    aim: "Pick your spot on the goal with the stick. Tap Set.",
    power: "Hold Shoot, let go for the power.",
    runup: "Here it goes",
  },
};

/** At a free kick or penalty: what to do now, or whose kick it is for everyone else. */
export function KickGuide({ kick }: { kick: KickState }) {
  const name = kick.kind === "penalty" ? "Penalty" : "Free kick";
  if (!kick.taker) {
    return (
      <div className="fifa-kick fifa-kick--watch">
        <strong>{name}</strong>
        <span>for {TEAMS[kick.team].name}</span>
      </div>
    );
  }
  return (
    <div className="fifa-kick">
      <strong>
        {name}: {kick.stage === "curve" ? "curve" : kick.stage === "power" ? "power" : kick.stage === "aim" ? "aim" : "go"}
      </strong>
      <span>{STEPS[kick.kind][kick.stage]}</span>
      {kick.stage === "curve" && (
        <div className="fifa-curve" aria-hidden="true">
          <span className="fifa-curve__mid" />
          <span className="fifa-curve__knob" style={{ left: `${50 + kick.curve * 50}%` }} />
        </div>
      )}
    </div>
  );
}
