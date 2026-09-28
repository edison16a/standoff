import { describe, expect, it } from "vitest";
import { HAMMOCK } from "./hammock";
import { MANGO_TIDE } from "./mango-tide";
import { phrase, thirdBelowInF } from "./phrase";

describe("tunes", () => {
  it("runs sixteen bars or more before repeating, the lobby slower than the round", () => {
    for (const loop of [HAMMOCK, MANGO_TIDE]) expect(loop.steps / 16).toBeGreaterThanOrEqual(16);
    expect(HAMMOCK.bpm).toBeLessThan(MANGO_TIDE.bpm);
  });

  it("reads phrases by step", () => {
    expect(phrase([[4, 64, 2]]).get(4)).toEqual({ note: 64, length: 2 });
  });

  it("harmonises a third below inside F major", () => {
    expect(thirdBelowInF(77)).toBe(74);
    expect(thirdBelowInF(81)).toBe(77);
    expect(thirdBelowInF(74)).toBe(70);
    expect(thirdBelowInF(76)).toBe(72);
  });
});
