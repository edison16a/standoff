import { describe, expect, it } from "vitest";
import { Bot } from "./bot";
import { Course } from "./course";
import { DEFAULT_DIFFICULTY, DIFFICULTIES, DIFFICULTY, difficultyRun, isDifficulty, multiplierText, type Difficulty } from "./difficulty";
import { Run } from "./run";
import { REACTION, SPEED, speedAt } from "./tuning";
import { yardSpeed } from "./yard";

describe("difficulty", () => {
  it("defaults to easy, which starts from a standstill as before", () => {
    expect(DEFAULT_DIFFICULTY).toBe("easy");
    expect(DIFFICULTY.easy.headStart).toBe(0);
    expect(new Run(1, difficultyRun("easy")).paceAt(0)).toBe(SPEED.start);
  });

  it("starts each harder level faster, with the score at zero", () => {
    const speeds = DIFFICULTIES.map((level) => new Run(1, difficultyRun(level)).paceAt(0));
    expect(speeds[1]!).toBeGreaterThan(speeds[0]! + 10);
    expect(speeds[2]!).toBeGreaterThan(speeds[1]!);
    expect(speeds[3]!).toBeGreaterThan(SPEED.max);
    expect(new Run(1, difficultyRun("demon")).score).toBe(0);
  });

  it("multiplies more on each harder level", () => {
    const multipliers = DIFFICULTIES.map((level) => DIFFICULTY[level].multiplier);
    expect(multipliers[0]).toBe(1);
    for (let i = 1; i < multipliers.length; i++) expect(multipliers[i]!).toBeGreaterThan(multipliers[i - 1]!);
    expect(multipliers.map(multiplierText)).toEqual(["x1", "x1.5", "x2", "x3"]);
  });

  it("keeps the practice run at a jog whatever the level", () => {
    expect(new Run(1, { practice: true, ...difficultyRun("demon") }).speed).toBeLessThan(SPEED.start);
  });

  it("lays a busier yard from the start on hard, and busier still on demon", () => {
    // Obstacles met in the first half minute of running, since a faster run spaces things wider in metres.
    const met = (level: Difficulty) => {
      const { headStart, yard } = DIFFICULTY[level];
      const reach = metresIn(30, (z) => yardSpeed(yard, z + headStart));
      let total = 0;
      for (const seed of [5, 6, 7]) {
        const course = new Course(seed, { headStart, yard });
        course.ensure(reach);
        total += course.obstacles.filter((o) => o.z < reach).length;
      }
      return total;
    };
    expect(met("hard")).toBeGreaterThan(met("easy") * 1.3);
    expect(met("demon")).toBeGreaterThan(met("hard") * 1.15);
  });

  it("checks stored values", () => {
    for (const level of DIFFICULTIES) expect(isDifficulty(level)).toBe(true);
    expect(isDifficulty("insane")).toBe(false);
  });
});

describe("a harder level never asks for two moves too close together", () => {
  for (const level of ["medium", "hard", "demon"] as const) {
    it(`in any one lane on ${level}`, () => {
      const { headStart, yard } = DIFFICULTY[level];
      const course = new Course(9, { headStart, yard });
      course.ensure(3000);
      const standing = course.obstacles.filter((o) => !o.drift && o.kind !== "ramp" && o.kind !== "train").sort((a, b) => a.z - b.z);
      for (const lane of [-1, 0, 1]) {
        const row = standing.filter((o) => o.lane === lane);
        for (let i = 1; i < row.length; i++) {
          const seconds = (row[i]!.z - (row[i - 1]!.z + row[i - 1]!.length)) / yardSpeed(yard, row[i]!.z + headStart);
          expect(seconds).toBeGreaterThanOrEqual(yard.moveGap);
        }
      }
    });
  }

  const hard = [1, 2].map((seed) => ["hard", seed] as const);
  const demon = [1, 2, 3, 4].map((seed) => ["demon", seed] as const);
  for (const [level, seed] of [...hard, ...demon]) {
    it(`for a runner who moves like a person on camera, on ${level}, seed ${seed}`, () => {
      const run = new Run(seed, difficultyRun(level));
      // Every move reaches the game a camera's lag late, and never comes sooner than the level's gap after the last.
      const bot = new Bot({ human: { lagS: REACTION.cameraS, gapS: DIFFICULTY[level].yard.moveGap } });
      while (run.runner.distance < 2500 && !run.crashed && run.time < 300) {
        bot.drive(run);
        run.update(1 / 60);
        run.drain();
      }
      expect(run.crashed).toBeNull();
    }, 120_000);
  }
});

/** How far a run gets in `seconds` at the speed `speed` gives for each distance. */
function metresIn(seconds: number, speed: (z: number) => number): number {
  let z = 0;
  for (let t = 0; t < seconds; t += 0.1) z += speed(z) * 0.1;
  return z;
}

// Keeps the usual pace in view: Demon runs past it, the others follow it exactly.
it("follows the usual pace below demon", () => {
  expect(new Run(1, difficultyRun("hard")).paceAt(100)).toBe(speedAt(3100));
});
