import { describe, expect, it } from "vitest";
import { recordPass } from "./lab-pass";
import { PASS_MOVES, PASS_STAGES } from "./lab-pass-scenes";

describe("the lab's staged passes and line play", () => {
  for (const move of PASS_MOVES) {
    it(`shows ${move}`, () => {
      const stage = PASS_STAGES[move];
      const run = recordPass(stage);
      expect(run.shown).toBe(true);
      expect(run.frames.length).toBeGreaterThan(stage.length * 50);
      if ("block" in stage) {
        const kind = stage.block.kind;
        expect(run.frames.some((f) => f.athletes.some((a) => a.block?.kind === kind))).toBe(true);
      }
    }, 20_000);
  }
});
