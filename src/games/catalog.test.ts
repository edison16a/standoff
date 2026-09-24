import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GAMES, isPlayable } from "./catalog";

describe("the game catalog", () => {
  it("lists every game folder once, by its folder name", () => {
    const folders = readdirSync(__dirname, { withFileTypes: true })
      // The kit is shared code for games, not a game.
      .filter((entry) => entry.isDirectory() && entry.name !== "kit")
      .map((entry) => entry.name)
      .sort();
    expect(GAMES.map((game) => game.id).sort()).toEqual(folders);
  });

  it("can load every game that is marked ready, and offers sane player counts", () => {
    for (const game of GAMES) {
      expect(isPlayable(game.id)).toBe(game.status === "ready");
      expect(game.players.length).toBeGreaterThan(0);
      for (const count of game.players) expect([1, 2, 3, 4, 5, 6]).toContain(count);
    }
  });
});
