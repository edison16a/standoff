import { describe, expect, it } from "vitest";
import { BUILD_IDS } from "../../builds";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";
import { botTuning } from "./skill";

const BOTS: Entry[] = BUILD_IDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));

describe("computer difficulty", () => {
  it("gets sharper from easy to hard", () => {
    const easy = botTuning("easy");
    const hard = botTuning("hard");
    expect(easy.spread).toBeGreaterThan(botTuning("medium").spread);
    expect(botTuning("medium").spread).toBeGreaterThan(hard.spread);
    expect(easy.pace).toBeLessThan(hard.pace);
    expect(easy.think).toBeGreaterThan(hard.think);
    expect(hard.think).toBe(0);
  });

  it("defaults a match to easy", () => {
    expect(new Match({ entries: BOTS, seed: 1 }).bots).toEqual(botTuning("easy"));
  });

  it("keeps computer players standing still in training", () => {
    const m = new Match({ entries: BOTS, seed: 3, botLevel: "training" });
    while (m.phase !== "live") m.step(STEP);
    const before = m.athletes.map((a) => ({ x: a.x, z: a.z }));
    for (let i = 0; i < 180; i++) m.step(STEP);
    m.athletes.forEach((a, i) => {
      expect(a.move).toEqual({ x: 0, z: 0 });
      expect(Math.hypot(a.x - before[i]!.x, a.z - before[i]!.z)).toBeLessThan(0.3);
    });
  });
});
