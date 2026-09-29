import type { Player } from "@/platform/games/game-api";

/**
 * What each player is called: the name the room has for their seat, or
 * Player 1 and Player 2 when nobody gave one, as in a game played
 * without phones.
 */
export function playerNames(players: readonly Player[], count = 2): string[] {
  return Array.from({ length: count }, (_, i) => players.find((p) => p.seat === i + 1)?.name.trim() || `Player ${i + 1}`);
}

/** One player's name from the store's list, by seat. */
export function nameOf(names: readonly string[], slot: number): string {
  return names[slot - 1] ?? `Player ${slot}`;
}
