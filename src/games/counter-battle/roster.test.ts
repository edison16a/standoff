import { describe, expect, it } from "vitest";
import { Rng } from "./engine/rng";
import { assignCharacters, CHARACTER_IDS, CHARACTERS } from "./roster";

describe("the roster", () => {
  it("gives every fighter a different character", () => {
    for (let seed = 1; seed < 20; seed++) {
      const picks = assignCharacters(4, new Rng(seed));
      expect(new Set(picks).size).toBe(4);
      expect(assignCharacters(2, new Rng(seed))).toHaveLength(2);
    }
  });

  it("shuffles, so nobody always gets the same one", () => {
    const firsts = new Set(Array.from({ length: 30 }, (_, i) => assignCharacters(4, new Rng(i + 1))[0]));
    expect(firsts.size).toBeGreaterThan(2);
  });

  it("describes all four", () => {
    for (const id of CHARACTER_IDS) expect(CHARACTERS[id].name.length).toBeGreaterThan(2);
  });
});
