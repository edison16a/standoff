import type { Match } from "./match";
import { FREE_THROW } from "./tuning";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/** Where the free throw shooter stands. */
export const LINE: V2 = { x: 0, z: FREE_THROW.lineZ };

const lane = (side: -1 | 1, z: number): V2 => ({ x: side * FREE_THROW.laneX, z });

/** The defence takes the spots nearest the basket on both sides, as the rules give them. */
const DEFENCE_SPOTS: readonly V2[] = [lane(-1, 2.4), lane(1, 2.4), lane(-1, 4.6)];
const OFFENCE_SPOTS: readonly V2[] = [lane(-1, 3.5), lane(1, 3.5)];

/**
 * Where everyone goes for free throws: the shooter at the line, their
 * teammates in the middle lane spots, and the defence below them and
 * above, ready to box out for a miss on the second shot.
 */
export function lineUp(m: Match, shooter: Athlete): Map<number, V2> {
  const spots = new Map<number, V2>([[shooter.id, LINE]]);
  const bySlot = (p: Athlete, q: Athlete) => p.slot - q.slot;
  m.teammates(shooter)
    .sort(bySlot)
    .forEach((a, i) => spots.set(a.id, OFFENCE_SPOTS[i] ?? lane(1, 4.6)));
  m.opponents(shooter.team)
    .sort(bySlot)
    .forEach((a, i) => spots.set(a.id, DEFENCE_SPOTS[i] ?? lane(1, 4.6)));
  return spots;
}
