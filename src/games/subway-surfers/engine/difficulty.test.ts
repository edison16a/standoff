import { describe, expect, it } from "vitest";
import { Bot } from "./bot";
import { Course } from "./course";
import { DEFAULT_DIFFICULTY, DIFFICULTIES, HEAD_START, isDifficulty } from "./difficulty";
import { Run } from "./run";
import { MOVE_GAP_S, REACTION, SPEED, speedAt } from "./tuning";

describe("difficulty", () => {
  it("defaults to easy, which starts from a standstill as before", () => {
    expect(DEFAULT_DIFFICULTY).toBe("easy");
    expect(HEAD_START.easy).toBe(0);
    expect(new Run(1).speed).toBe(SPEED.start);
  });

  it("starts each harder level faster, with the score at zero", () => {
    const speeds = DIFFICULTIES.map((level) => new Run(1, { headStart: HEAD_START[level] }).speed);
    expect(speeds[1]!).toBeGreaterThan(speeds[0]! + 10);
    expect(speeds[2]!).toBeGreaterThan(speeds[1]!);
    expect(new Run(1, { headStart: HEAD_START.hard }).score).toBe(0);
  });

  it("keeps the practice run at a jog whatever the level", () => {
    expect(new Run(1, { practice: true, headStart: HEAD_START.hard }).speed).toBeLessThan(SPEED.start);
  });

  it("lays a busier yard from the start on hard", () => {
    // Counted over the first half minute of running, since a faster run spaces things wider in metres.
    const met = (headStart: number) => {
      const reach = metresIn(30, headStart);
      let total = 0;
      for (const seed of [5, 6, 7]) {
        const course = new Course(seed, { headStart });
        course.ensure(reach);
        total += course.obstacles.filter((o) => o.z < reach).length;
      }
      return total;
    };
    expect(met(HEAD_START.hard)).toBeGreaterThan(met(HEAD_START.easy) * 1.3);
  });

  it("checks stored values", () => {
    for (const level of DIFFICULTIES) expect(isDifficulty(level)).toBe(true);
    expect(isDifficulty("insane")).toBe(false);
  });
});

describe("a head start never asks for two moves too close together", () => {
  for (const level of ["medium", "hard"] as const) {
    it(`in any one lane on ${level}`, () => {
      const headStart = HEAD_START[level];
      const course = new Course(9, { headStart });
      course.ensure(3000);
      const standing = course.obstacles.filter((o) => !o.drift && o.kind !== "ramp" && o.kind !== "train").sort((a, b) => a.z - b.z);
      for (const lane of [-1, 0, 1]) {
        const row = standing.filter((o) => o.lane === lane);
        for (let i = 1; i < row.length; i++) {
          const seconds = (row[i]!.z - (row[i - 1]!.z + row[i - 1]!.length)) / speedAt(row[i]!.z + headStart);
          expect(seconds).toBeGreaterThanOrEqual(MOVE_GAP_S);
        }
      }
    });
  }

  for (const seed of [1, 2]) {
    it(`for a runner who moves like a person on camera, on hard, seed ${seed}`, () => {
      const run = new Run(seed, { headStart: HEAD_START.hard });
      const bot = new Bot({ human: { lagS: REACTION.cameraS, gapS: MOVE_GAP_S } });
      while (run.runner.distance < 2500 && !run.crashed && run.time < 300) {
        bot.drive(run);
        run.update(1 / 60);
        run.drain();
      }
      expect(run.crashed).toBeNull();
    }, 120_000);
  }
});

/** How far a run with this head start gets in `seconds`. */
function metresIn(seconds: number, headStart: number): number {
  let z = 0;
  for (let t = 0; t < seconds; t += 0.1) z += speedAt(z + headStart) * 0.1;
  return z;
}
