import { describe, expect, it } from "vitest";
import { PLAYER_COLORS } from "@/games/kit/players";
import { fighterColours } from "./colors";

describe("fighterColours", () => {
  it("gives phones their seat colour and bots the spare ones", () => {
    const out = fighterColours([
      { seat: 2, character: "karate" },
      { seat: null, character: "bear" },
      { seat: null, character: "mage" },
    ]);
    expect(out.map((c) => c.colour)).toEqual([PLAYER_COLORS[1], PLAYER_COLORS[0], PLAYER_COLORS[2]]);
    expect(new Set(out.map((c) => c.colour)).size).toBe(3);
  });

  it("tints only characters picked more than once", () => {
    const out = fighterColours([
      { seat: 1, character: "samurai" },
      { seat: 2, character: "samurai" },
      { seat: 3, character: "mage" },
    ]);
    expect(out[0]!.tint).toBe(PLAYER_COLORS[0]);
    expect(out[1]!.tint).toBe(PLAYER_COLORS[1]);
    expect(out[2]!.tint).toBeNull();
  });
});
