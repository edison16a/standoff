import type { SeatStatus } from "../engine/status";
import type { Book } from "../protocol";

const unit = (n: number) => Math.max(0, Math.min(1, n));
const point = ([u, v]: [number, number]): [number, number] => [unit(u), unit(v)];

/**
 * The engine's page of plays as the phone's message carries it: whole
 * seconds on the clock, and every point held inside the card so a stray
 * one can never fail the message's checks.
 */
export function bookFor(status: SeatStatus["book"]): Book | null {
  if (!status) return null;
  return {
    call: status.call,
    left: Math.ceil(status.left),
    los: unit(status.frame.los),
    qb: point(status.frame.qb),
    plays: status.cards.slice(0, 6).map((card) => ({
      name: card.name.slice(0, 32),
      runners: card.runners.slice(0, 4).map((r) => ({ ...r, word: r.word.slice(0, 16), path: r.path.slice(0, 8).map(point) })),
    })),
  };
}
