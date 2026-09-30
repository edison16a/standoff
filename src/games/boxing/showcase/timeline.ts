/**
 * The trailer's clock: how real seconds of the loop map to fight
 * seconds, with the cut over the count and the slow motion knockout.
 */

/** The trailer repeats every this many seconds, so the captured clip loops cleanly. */
export const CYCLE_S = 11;
/** Real seconds into the loop where the fight cuts to the champion lifting the belt. */
export const CEREMONY_AT = 8.3;
/** Real seconds where the film cuts over the count after the first knockdown, and the fight seconds it skips. */
export const JUMP_AT = 4.45;
export const JUMP_S = 3.3;
/** Real seconds of the cycle where the knockout blow plays in slow motion, and how slow. */
const SLOW_FROM = 6.15;
const SLOW_TO = 7.3;
const SLOW = 0.18;

/** Fight seconds reached at `cycle` real seconds into the loop. */
export function cycleToFight(cycle: number): number {
  const jumped = cycle >= JUMP_AT ? JUMP_S : 0;
  const normal = Math.min(cycle, SLOW_FROM);
  const slow = Math.max(0, Math.min(cycle, SLOW_TO) - SLOW_FROM);
  const after = Math.max(0, cycle - SLOW_TO);
  return normal + slow * SLOW + after + jumped;
}

/** How fast time runs at this point of the loop, for the particles and the crowd. */
export function speedAt(cycle: number): number {
  return cycle >= SLOW_FROM && cycle < SLOW_TO ? SLOW : 1;
}
