import type { Athlete } from "./types";
import { clamp, type V2 } from "./vec";

/**
 * When a reach for the ball is a foul. A defender square in front of
 * the ball handler plays the ball: whatever they catch is clean. From
 * the side or behind, a swipe that catches the hand instead of the
 * ball is a foul, and each reach on the same player in a possession
 * makes the next more likely to land on the hand.
 */

/** Within this angle either side of where the ball handler faces, the defender is in front. */
export const FRONT_ANGLE = (35 * Math.PI) / 180;

/** How square a player stands to `holder`'s chest: 1 dead in front, 0 beside, -1 behind. */
export function frontness(a: V2, holder: Athlete): number {
  const dx = a.x - holder.x;
  const dz = a.z - holder.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return 1;
  return (Math.sin(holder.yaw) * dx + Math.cos(holder.yaw) * dz) / d;
}

export function inFront(a: V2, holder: Athlete): boolean {
  return frontness(a, holder) >= Math.cos(FRONT_ANGLE);
}

/**
 * The chance a swipe from the side or behind catches the hand: attempt 1
 * is the first this possession. Kept low so only a clear slap on the arm
 * is called, the way a referee lets most hand checking go.
 */
export const HAND = { first: 0.08, perTry: 0.05, most: 0.3 } as const;

export function handChance(attempt: number): number {
  if (attempt < 1) return 0;
  return clamp(HAND.first + (attempt - 1) * HAND.perTry, HAND.first, HAND.most);
}

/** Free throws for a foul: two for a reach in or a missed two, three for a missed three, one after a make. */
export function shotsFor(made: boolean, points: number): 1 | 2 | 3 {
  if (made) return 1;
  return points === 3 ? 3 : 2;
}

export class StealLog {
  private readonly tries = new Map<string, number>();

  /** Counts a new attempt and returns its number, from 1. */
  attempt(defender: number, handler: number): number {
    const key = `${defender}:${handler}`;
    const n = (this.tries.get(key) ?? 0) + 1;
    this.tries.set(key, n);
    return n;
  }

  /** How many attempts this defender has had on this handler so far. */
  count(defender: number, handler: number): number {
    return this.tries.get(`${defender}:${handler}`) ?? 0;
  }

  reset(): void {
    this.tries.clear();
  }
}
