import { describe, expect, it } from "vitest";
import { memoryBoards, readBoard } from "@/games/kit/leaderboard";
import { RUNS_BOARD } from "./results";
import { importOldBest } from "./run-board";

const OLD_KEY = "standoff:subway-surfers:best";

describe("the old best runs table", () => {
  it("moves onto the leaderboard once, then is gone", () => {
    const storage = memoryBoards();
    const old = [
      { name: "Ana", score: 9000, coins: 80, distance: 2100, at: 1 },
      { name: "Bo", score: 12000, coins: 90, distance: 2500, at: 2 },
      { name: "", score: 5, coins: 0, distance: 1, at: 3 },
    ];
    storage.setItem(OLD_KEY, JSON.stringify(old));
    expect(importOldBest(storage)).toBe(2);
    expect(readBoard(RUNS_BOARD, storage).map((e) => [e.name, e.value])).toEqual([
      ["Bo", 12000],
      ["Ana", 9000],
    ]);
    expect(storage.getItem(OLD_KEY)).toBeNull();
    expect(importOldBest(storage)).toBe(0);
    expect(readBoard(RUNS_BOARD, storage)).toHaveLength(2);
  });

  it("adds nothing when it cannot be read", () => {
    const storage = memoryBoards();
    storage.setItem(OLD_KEY, "{broken");
    expect(importOldBest(storage)).toBe(0);
    expect(readBoard(RUNS_BOARD, storage)).toEqual([]);
  });
});
