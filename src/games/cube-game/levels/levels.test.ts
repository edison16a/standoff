import { describe, expect, it } from "vitest";
import { trace } from "../engine/trace";
import type { Level } from "../engine/types";
import { LEVELS, levelById } from "./index";

const times = (level: Level, shift = 0) => level.solution.map((beat) => (beat * 60) / level.bpm + shift);

/** How early and how late every jump may come, all together, by difficulty. A camera jump arrives a little late. */
const SLACK: Record<number, { early: number; late: number }> = {
  1: { early: 0.08, late: 0.1 },
  2: { early: 0.07, late: 0.08 },
  3: { early: 0.06, late: 0.07 },
  4: { early: 0.05, late: 0.06 },
  5: { early: 0.04, late: 0.05 },
};

describe("every level", () => {
  it("comes in order of difficulty", () => {
    expect(LEVELS.map((l) => l.info.difficulty)).toEqual([...LEVELS.map((l) => l.info.difficulty)].sort());
  });

  for (const entry of LEVELS) {
    describe(entry.info.name, () => {
      const level = levelById(entry.info.id);

      it("is finished by a perfect run jumping on its beats", () => {
        const run = trace(level, times(level));
        expect(run.death).toBeNull();
        expect(run.finished).toBe(true);
      });

      it("kills a run that never jumps", () => {
        expect(trace(level, []).finished).toBe(false);
      });

      it("forgives jumps a little early or late", () => {
        const { early, late } = SLACK[level.difficulty]!;
        expect(trace(level, times(level, -early)).death).toBeNull();
        expect(trace(level, times(level, late)).death).toBeNull();
      });

      it("never asks for two jumps closer than a person can jump", () => {
        const at = times(level);
        const gaps = at.slice(1).map((t, i) => t - at[i]!);
        expect(Math.min(...gaps)).toBeGreaterThanOrEqual(0.43);
      });

      it("keeps its music and its finish in step", () => {
        const run = trace(level, times(level));
        expect(run.points.at(-1)!.t).toBeCloseTo((level.beats * 60) / level.bpm, 1);
      });
    });
  }
});
