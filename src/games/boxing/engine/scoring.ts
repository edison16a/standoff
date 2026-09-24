import type { MatchResult } from "./events";
import type { Fighter } from "./fighter";

/** Rounds closer than this much damage are scored even. */
const EVEN_MARGIN = 3;

/**
 * The ten point must system, as judges score it: the boxer who did more
 * in a round gets 10 and the other 9, a very close round is 10 all, and
 * every knockdown suffered costs one more point.
 */
export function scoreRound(a: Fighter, b: Fighter, round: number): [number, number] {
  const dealtA = a.roundDamage[round - 1] ?? 0;
  const dealtB = b.roundDamage[round - 1] ?? 0;
  let cardA = 10;
  let cardB = 10;
  if (dealtA - dealtB >= EVEN_MARGIN) cardB = 9;
  else if (dealtB - dealtA >= EVEN_MARGIN) cardA = 9;
  cardA -= a.roundKnockdowns[round - 1] ?? 0;
  cardB -= b.roundKnockdowns[round - 1] ?? 0;
  return [cardA, cardB];
}

export function scorecards(a: Fighter, b: Fighter, rounds: number): { cards: [number, number][]; totals: [number, number] } {
  const cards = Array.from({ length: rounds }, (_, i) => scoreRound(a, b, i + 1));
  const totals = cards.reduce<[number, number]>((sum, [x, y]) => [sum[0] + x, sum[1] + y], [0, 0]);
  return { cards, totals };
}

/** The result when the final bell goes with both boxers standing. */
export function decision(a: Fighter, b: Fighter, rounds: number): MatchResult {
  const { cards, totals } = scorecards(a, b, rounds);
  const winner = totals[0] > totals[1] ? 0 : totals[1] > totals[0] ? 1 : null;
  return { winner, method: winner === null ? "Draw" : "Decision", round: rounds, second: 0, cards, totals };
}
