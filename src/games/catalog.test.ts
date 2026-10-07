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

  it("leads with the Standoff Premium games, and only those carry the flag", () => {
    const ids = GAMES.map((game) => game.id);
    expect(ids.slice(0, 3)).toEqual(["nba-3v3", "magic-kart", "football-3v3"]);
    expect(GAMES.filter((game) => game.premium).map((game) => game.id)).toEqual(ids.slice(0, 3));
  });

  it("keeps the rest in their home screen order", () => {
    expect(GAMES.slice(3).map((game) => game.id)).toEqual([
      "fruit-ninja",
      "zombie-survival",
      "shooting-gallery",
      "boxing",
      "subway-surfers",
      "fifa-3v3",
      "cube-game",
      "blade-clash",
      "brawl-battle",
      "counter-battle",
    ]);
  });
});
