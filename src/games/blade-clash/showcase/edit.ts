/**
 * The trailer's edit: which stretches of the scripted duel it shows, cut
 * together so nothing slow survives. The walk back to the marks between
 * points and the pause before the ceremony are cut out.
 */

/** One stretch of the duel: from `at` seconds into the trailer it shows the duel from `duel` seconds in. */
export interface Take {
  at: number;
  duel: number;
}

/** The trailer repeats every this many seconds, so the captured clip loops cleanly. */
export const CYCLE_S = 9;

export const TAKES: readonly Take[] = [
  // Stepping in, the two clashes, and the first cut landing in slow motion.
  { at: 0, duel: 0.35 },
  // Stepping in again for the winning overhead cut, its slow motion and the burst as time snaps back.
  { at: 3.35, duel: 5.6 },
  // The winner's ceremony, from the moment the match is won.
  { at: 6.05, duel: 9.25 },
];

/** The take on screen at `t` seconds into the trailer. */
export function takeAt(t: number): number {
  let index = 0;
  TAKES.forEach((take, i) => {
    if (t >= take.at) index = i;
  });
  return index;
}

/** Seconds into the duel shown at `t` seconds into the trailer. */
export function duelAt(t: number): number {
  const take = TAKES[takeAt(t)]!;
  return take.duel + (t - take.at);
}
