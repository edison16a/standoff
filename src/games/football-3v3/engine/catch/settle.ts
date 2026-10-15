import { attackSign } from "../../teams";
import type { CatchPlan } from "../catch-preset";
import { knockDown } from "../down";
import { FIELD } from "../field";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { angleDiff } from "../vec";
import { endPlay } from "../whistle";

/**
 * What the body does around a catch beyond the hands, for the moves
 * that need the engine's help (catch-preset.ts). A whip stops him dead
 * and turns him upfield in one go, leaving the swing for the drawing. A
 * one handed grab lands him off balance and he goes down where he lands.
 * A toe tap keeps his feet on the paint, in bounds, until it is caught.
 */
export const SETTLE = {
  /** Seconds after a one handed catch that he hits the turf, and how long he is down. */
  fall: 0.32,
  down: 1.3,
  /** How far inside the sideline a toe tap keeps his feet, metres. */
  toeIn: 0.15,
  /** Seconds after the catch the toe tap still holds him in. */
  toeAfter: 0.15,
} as const;

/** Facing upfield for his team: yaw 0 looks toward +z, so +x is a quarter turn. */
const upfield = (a: Athlete) => (attackSign(a.team) > 0 ? Math.PI / 2 : -Math.PI / 2);

/** On the catch: a whip stops him and turns him upfield, the swing left for the drawing to play. */
export function settleCatch(a: Athlete, p: CatchPlan): void {
  if (p.kind !== "whip") return;
  const up = upfield(a);
  p.turn = angleDiff(up, a.yaw);
  a.yaw = up;
  a.vx = 0;
  a.vz = 0;
}

/** Each step of a move: a toe tap holds the feet in, a one handed catch falls. */
export function settleStep(m: Match, a: Athlete, p: CatchPlan, dt: number): void {
  if (p.kind === "toetap" && (!p.result || p.since < SETTLE.toeAfter)) return toesIn(a);
  if (p.kind !== "onehand" || p.result !== "held" || a.action.kind !== "none") return;
  if (p.since < SETTLE.fall || p.since - dt >= SETTLE.fall) return;
  knockDown(a, SETTLE.down, "dive");
  // Down on the turf with it, like a diving catch: the play is over where he lands.
  if (m.carrier() === a && m.phase === "live") endPlay(m, "dive");
}

/** Dragging the toes along the sideline: never past the paint, never moving out over it. */
function toesIn(a: Athlete): void {
  const edge = FIELD.halfWidth - SETTLE.toeIn;
  if (Math.abs(a.z) <= edge) return;
  const out = Math.sign(a.z);
  a.z = out * edge;
  if (a.vz * out > 0) a.vz = 0;
}
