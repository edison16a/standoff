import type { Player } from "@/platform/games/game-api";
import { defaultName } from "@/platform/profile";
import type { Seat } from "@/platform/protocol";
import type { BestEntry } from "../engine/high-scores";
import type { Standing } from "../engine/scoring";

/**
 * Whether a player typed a name. A phone that skipped the name screen
 * plays as "Player 2", and that means nothing on a board kept for weeks,
 * where next week's Player 2 is someone else.
 */
export function isNamed(players: readonly Player[], seat: Seat): boolean {
  const name = players[seat - 1]?.name.trim() ?? "";
  return name !== "" && name !== defaultName(seat);
}

/** The scores from a round that may go on the best scores board: only named players' ones. */
export function boardEntries(standings: readonly Standing[], players: readonly Player[], seconds: number, at: number): { seat: Seat; entry: BestEntry }[] {
  return standings
    .filter((s) => isNamed(players, s.seat))
    .map((s) => ({ seat: s.seat, entry: { name: players[s.seat - 1]!.name.trim(), score: s.score, accuracy: s.accuracy, seconds, at } }));
}
