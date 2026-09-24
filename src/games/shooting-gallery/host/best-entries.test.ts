import { describe, expect, it } from "vitest";
import type { Player } from "@/platform/games/game-api";
import { rank } from "../engine/scoring";
import { boardEntries, isNamed } from "./best-entries";

const players: Player[] = [
  { seat: 1, name: "Ann", connected: true },
  { seat: 2, name: "Player 2", connected: true },
  { seat: 3, name: "  ", connected: true },
  { seat: 4, name: "Dee", connected: false },
];

describe("best scores board entries", () => {
  it("knows a typed name from a skipped one", () => {
    expect(isNamed(players, 1)).toBe(true);
    expect(isNamed(players, 2)).toBe(false);
    expect(isNamed(players, 3)).toBe(false);
    // Someone who left mid round still typed their name.
    expect(isNamed(players, 4)).toBe(true);
  });

  it("keeps only named players' scores, with their seats", () => {
    const tally = (seat: number, score: number) => ({ seat, score, shots: 4, hits: 2, specials: 0 });
    const standings = rank([tally(1, 40), tally(2, 90), tally(3, 20), tally(4, 10)]);
    const entries = boardEntries(standings, players, 20, 5);
    expect(entries.map((e) => [e.seat, e.entry.name, e.entry.score])).toEqual([
      [1, "Ann", 40],
      [4, "Dee", 10],
    ]);
    expect(entries[0]!.entry).toMatchObject({ seconds: 20, at: 5, accuracy: 0.5 });
  });
});
