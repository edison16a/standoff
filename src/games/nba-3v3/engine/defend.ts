import { airborne } from "./athlete";
import { startBlock } from "./block";
import type { Match } from "./match";
import { pressDribble } from "./moves";
import { inStealRange, stealable, startSteal } from "./steal";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

export { updateBlock } from "./block";
export { updateSteal } from "./steal";

/**
 * The third button changes with the play. With the ball it is Dribble,
 * a move picked by the stick. On defence right next to the ball it
 * swipes for a steal. Anywhere else it jumps with the arms up.
 */
export function pressDefend(m: Match, a: Athlete, aim: V2 | null = null): void {
  const holder = m.holder;
  if (holder === a) return pressDribble(m, a, aim);
  if ((a.action.kind !== "none" && a.action.kind !== "pass") || airborne(a)) return;
  if (holder && holder.team !== a.team && stealable(holder) && inStealRange(a, holder)) return startSteal(m, a, holder);
  startBlock(a);
}

/** Whether the button would swipe for the ball right now, which the phone shows as Steal. */
export function canSteal(m: Match, a: Athlete): boolean {
  const holder = m.holder;
  return !!holder && holder.team !== a.team && stealable(holder) && inStealRange(a, holder);
}
