import type { Match } from "./match";
import type { Athlete } from "./types";

/**
 * Whether the ball handler is already in his shooting motion with the
 * ball still in his hands: rising into a jumper or a floater, gathered
 * into a layup or a dunk, or picking up his dribble to finish at the rim.
 *
 * The shot clock lets a shot in motion finish (see `rules.ts`). Without
 * that, the clock running out in the half second of a gather knocked
 * the ball out of his hands while the body went on up into an empty
 * layup, which read as the shot cutting off.
 */
export function shotInMotion(m: Match, a: Athlete): boolean {
  if (m.ball.holder !== a.id) return false;
  const act = a.action;
  if (act.kind === "shoot") return !act.released && !act.free;
  if (act.kind === "drive") return !act.released;
  return m.pickUps.has(a.id);
}
