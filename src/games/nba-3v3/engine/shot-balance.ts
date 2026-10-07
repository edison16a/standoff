import type { Athlete, DribbleMove } from "./types";
import { clamp } from "./vec";

/**
 * How off balance a jumper goes up, 0 square and set to 1 falling away.
 * A shot straight out of a dribble move is never quite set, a stepback
 * least of all, and a hop back off a man in the chest is the most off
 * balance of all. Off balance a hand in the face counts for more,
 * because the shooter cannot rise over it (see `shot-model.ts`).
 */
const OUT_OF_MOVE: Record<DribbleMove, number> = {
  stepback: 0.75,
  betweenLegs: 0.45,
  spin: 0.55,
  crossover: 0.3,
  behindBack: 0.3,
  hesitation: 0.15,
};

/** The hop on Shoot with a defender in the chest. */
export const HOP_BALANCE = 1;

/** Drifting into the shot: past a jog the feet are still going as he rises. */
function drift(a: Athlete): number {
  return clamp((Math.hypot(a.vx, a.vz) - 2) / 4, 0, 0.35);
}

/** How off balance a jumper starting now is, given the move it came out of, if any. */
export function offBalanceFor(a: Athlete, move: DribbleMove | null, hop: boolean): number {
  if (hop) return HOP_BALANCE;
  return clamp((move ? OUT_OF_MOVE[move] : 0) + drift(a), 0, 1);
}

/** The off balance of a shooter's jumper in flight, 0 for anything else. */
export function shotBalance(a: Athlete): number {
  return a.action.kind === "shoot" ? (a.action.offBalance ?? 0) : 0;
}
