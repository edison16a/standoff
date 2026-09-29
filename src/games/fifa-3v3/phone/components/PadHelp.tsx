"use client";
import type { PhoneState } from "../../protocol";

/**
 * Guard's reach, shown on the phone while defending: the man it shadows,
 * how far away he is, and whether Guard can take over from here.
 */
export function GuardMeter({ guard }: { guard: NonNullable<PhoneState["guard"]> }) {
  const state = guard.on ? "on" : guard.inRange ? "ready" : "far";
  const word = guard.on ? "Guarding" : guard.inRange ? "In range" : "Too far";
  return (
    <div className={`fifa-guard fifa-guard--${state}`} aria-label={`Guard ${guard.mark}, ${guard.distance} metres, ${word}`}>
      <span className="fifa-guard__label">Guard</span>
      <strong>{guard.mark}</strong>
      <span className="fifa-guard__dist">{guard.distance} m</span>
      <span className="fifa-guard__state">{word}</span>
    </div>
  );
}

const STAGES = { free: ["aim", "curve", "power"], penalty: ["aim", "power"] } as const;
const STAGE_NAMES = { aim: "Aim", curve: "Curve", power: "Power", struck: "Kick" } as const;

/** What to do at each stage of a set piece, for the taker; what is going on, for everyone else. */
export function SetPieceCoach({ sp }: { sp: NonNullable<PhoneState["setPiece"]> }) {
  const title = sp.kind === "penalty" ? "Penalty" : "Free kick";
  if (sp.part !== "taker") {
    const note = sp.part === "wall" ? "You are in the wall. It jumps when the ball is struck." : sp.part === "attack" ? "Your side is taking it." : "Get ready to defend.";
    return (
      <div className="fifa-coach">
        <strong className="fifa-coach__title">{title}</strong>
        <span className="fifa-coach__tip">{note}</span>
      </div>
    );
  }
  const tips = {
    aim: sp.kind === "penalty" ? "Stick moves the target. Tap Set." : "Stick left or right aims the line. Tap Set.",
    curve: "Stick bends the path. It still ends on your aim. Tap Set.",
    power: "Hold Kick for power. Let go to shoot.",
    struck: "Here it goes.",
  } as const;
  return (
    <div className="fifa-coach">
      <strong className="fifa-coach__title">{title}</strong>
      <ol className="fifa-coach__steps" aria-label="Stages">
        {STAGES[sp.kind].map((stage) => (
          <li key={stage} className={stage === sp.stage ? "fifa-coach__step fifa-coach__step--on" : "fifa-coach__step"}>
            {STAGE_NAMES[stage]}
          </li>
        ))}
      </ol>
      <span className="fifa-coach__tip">{tips[sp.stage]}</span>
    </div>
  );
}
