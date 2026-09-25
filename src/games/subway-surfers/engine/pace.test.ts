import { describe, expect, it } from "vitest";
import { Bot } from "./bot";
import { Course } from "./course";
import { Hands } from "./hands";
import { Run } from "./run";
import { MOVE_GAP_S, REACTION, SPEED, speedAt } from "./tuning";
import type { Obstacle } from "./types";

describe("the pace", () => {
  it("climbs quickly to a hard top speed and never past it", () => {
    expect(speedAt(0)).toBe(SPEED.start);
    expect(speedAt(700)).toBeGreaterThan(20);
    expect(speedAt(2000)).toBeGreaterThan(29);
    let last = 0;
    for (let d = 0; d < 20000; d += 50) {
      expect(speedAt(d)).toBeGreaterThanOrEqual(last);
      expect(speedAt(d)).toBeLessThanOrEqual(SPEED.max);
      last = speedAt(d);
    }
    expect(last).toBeGreaterThan(SPEED.max - 0.1);
  });

  it("leaves room for the camera to read one move before the next", () => {
    expect(MOVE_GAP_S).toBeGreaterThanOrEqual(0.45 + REACTION.cameraS);
  });
});

/** Standing things one after another in one lane, skipping a train that follows straight on from its own ramp. */
function rows(course: Course): Obstacle[][] {
  const standing = course.obstacles.filter((o) => !o.drift).sort((a, b) => a.z - b.z);
  return [-1, 0, 1].map((lane) => standing.filter((o) => o.lane === lane)).map((row) => row.filter((o, i) => !(o.kind === "train" && row[i - 1]?.kind === "ramp" && Math.abs(row[i - 1]!.z + row[i - 1]!.length - o.z) < 0.01)));
}

describe("the course never asks for two moves too close together", () => {
  for (const seed of [2, 9, 31, 64, 77]) {
    it(`in any one lane, at every speed, on seed ${seed}`, () => {
      const course = new Course(seed);
      course.ensure(9000);
      for (const row of rows(course)) {
        for (let i = 1; i < row.length; i++) {
          const before = row[i - 1]!;
          const next = row[i]!;
          const seconds = (next.z - (before.z + before.length)) / speedAt(next.z);
          expect(seconds).toBeGreaterThanOrEqual(MOVE_GAP_S);
        }
      }
    });
  }

  for (const seed of [1, 2, 3, 4, 5]) {
    it(`for a runner who moves like a person on camera, up to top speed, on seed ${seed}`, () => {
      // Every move reaches the game a camera's lag late, and never comes sooner than the gap after the last.
      const run = new Run(seed);
      const bot = new Bot({ human: { lagS: REACTION.cameraS, gapS: MOVE_GAP_S } });
      while (run.runner.distance < 6000 && !run.crashed && run.time < 600) {
        bot.drive(run);
        run.update(1 / 60);
        run.drain();
      }
      expect(run.crashed).toBeNull();
      expect(run.speed).toBeGreaterThan(SPEED.max - 1);
    }, 120_000);
  }
});

describe("a person's hands", () => {
  it("reach the game a camera's lag late", () => {
    const hands = new Hands(0.2, 0.65);
    expect(hands.make(1, 1, "none")).toBe(true);
    expect(hands.take(1.1)).toEqual({ lane: 0, action: "none" });
    expect(hands.take(1.2)).toEqual({ lane: 1, action: "none" });
  });

  it("wait the gap before the next move, and do not count standing still as one", () => {
    const hands = new Hands(0.2, 0.65);
    expect(hands.make(0, 0, "none")).toBe(false);
    hands.make(0, 0, "jump");
    expect(hands.free(0.3)).toBe(false);
    expect(hands.take(0.3).action).toBe("jump");
    expect(hands.free(0.5)).toBe(false);
    expect(hands.free(0.65)).toBe(true);
  });
});
