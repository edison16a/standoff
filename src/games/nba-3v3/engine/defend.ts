import { airborne } from "./athlete";
import { startBlock } from "./block";
import { planBlock } from "./blocks/plan";
import { jumpStyle } from "./blocks/style";
import type { Match } from "./match";
import { pressDribble } from "./moves";
import { inStealRange, stealable, startSteal } from "./steal";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

export { updateBlock } from "./block";
export { updateSteal } from "./steal";

/**
 * The third button changes with the play. With the ball it is Dribble,
 * a move picked by the stick. On defence it is always Steal while the
 * ball can be reached for, even when too far to get there, which just
 * swipes at air. Anywhere else, and against a shooter, it jumps with
 * the arms up.
 */
export function pressDefend(m: Match, a: Athlete, aim: V2 | null = null): void {
  const holder = m.holder;
  if (holder === a) return pressDribble(m, a, aim);
  if (!ready(a)) return;
  if (canSteal(m, a) && holder) return startSteal(m, a, holder);
  jump(m, a);
}

/** On defence Pass becomes Block: a jump with the arms up whenever it is wanted, Guard held or not. */
export function pressJump(m: Match, a: Athlete): void {
  if (ready(a)) jump(m, a);
}

/** Up he goes, the way the play calls for, with any shot already in the air planned against him. */
function jump(m: Match, a: Athlete): void {
  startBlock(a, jumpStyle(m, a));
  planBlock(m, a);
}

function ready(a: Athlete): boolean {
  return (a.action.kind === "none" || a.action.kind === "pass") && !airborne(a);
}

/** Whether the button swipes for the ball right now, which the phone shows as Steal. */
export function canSteal(m: Match, a: Athlete): boolean {
  const holder = m.holder;
  return !!holder && holder.team !== a.team && stealable(holder);
}

/** Whether a swipe now would reach the ball, for the phone to light the button up. */
export function stealInReach(m: Match, a: Athlete): boolean {
  const holder = m.holder;
  return canSteal(m, a) && !!holder && inStealRange(a, holder);
}
