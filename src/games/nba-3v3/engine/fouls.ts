/**
 * Reaching in too often is a foul. Every steal attempt by one defender
 * on one ball handler in the same possession is counted: the first two
 * are free, the third fouls one time in five, the fourth two in five,
 * and from the fifth on three in five. A change of possession wipes the
 * slate clean.
 */
const CHANCES = [0, 0, 0.2, 0.4, 0.6] as const;

/** The chance that steal attempt number `attempt` (from 1) is called a foul. */
export function foulChance(attempt: number): number {
  if (attempt < 1) return 0;
  return CHANCES[Math.min(attempt, CHANCES.length) - 1]!;
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
