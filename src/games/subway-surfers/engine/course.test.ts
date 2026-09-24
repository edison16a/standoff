import { describe, expect, it } from "vitest";
import { Bot } from "./bot";
import { Course } from "./course";
import { Run } from "./run";
import { BARRIER } from "./tuning";
import { frontAt } from "./types";

/** Plays a whole run with the bot until it crashes or reaches `distance`. */
function botRun(seed: number, distance: number): Run {
  const run = new Run(seed);
  const bot = new Bot();
  while (run.runner.distance < distance && !run.crashed && run.time < 1200) {
    bot.drive(run);
    run.update(1 / 60);
    run.drain();
  }
  return run;
}

describe("the course", () => {
  it("lays the same yard for the same seed", () => {
    const a = new Course(42);
    const b = new Course(42);
    a.ensure(2000);
    b.ensure(2000);
    expect(a.obstacles).toEqual(b.obstacles);
    expect(a.coins.length).toBe(b.coins.length);
    expect(a.pickups).toEqual(b.pickups);
  });

  it("lays a different yard for another seed", () => {
    const a = new Course(1);
    const b = new Course(2);
    a.ensure(1000);
    b.ensure(1000);
    expect(a.obstacles.map((o) => o.z)).not.toEqual(b.obstacles.map((o) => o.z));
  });

  it("keeps the start clear while the guard gives chase", () => {
    const course = new Course(7);
    course.ensure(0);
    expect(Math.min(...course.obstacles.map((o) => o.z))).toBeGreaterThanOrEqual(50);
  });

  it("never stacks two standing things in one lane", () => {
    for (const seed of [3, 11, 99]) {
      const course = new Course(seed);
      course.ensure(4000);
      const standing = course.obstacles.filter((o) => !o.drift).sort((a, b) => a.z - b.z);
      for (const lane of [-1, 0, 1]) {
        const row = standing.filter((o) => o.lane === lane);
        for (let i = 1; i < row.length; i++) expect(row[i]!.z).toBeGreaterThanOrEqual(row[i - 1]!.z + row[i - 1]!.length - 0.01);
      }
    }
  });

  it("keeps the lane ahead of a moving train clear, so it never drives through anything", () => {
    for (const seed of [5, 8, 13, 21]) {
      const course = new Course(seed);
      course.ensure(6000);
      for (const train of course.obstacles.filter((o) => o.drift)) {
        const inLane = course.obstacles.filter((o) => o !== train && o.lane === train.lane);
        // From the meeting point to where it was when it came into view.
        const far = frontAt(train, train.z - 150 / (1 + train.drift)) + train.length;
        for (const other of inLane) expect(other.z + other.length <= train.z || other.z >= far).toBe(true);
      }
    }
  });

  it("puts barriers where they can be jumped or rolled", () => {
    const course = new Course(17);
    course.ensure(3000);
    for (const o of course.obstacles.filter((o) => o.kind === "low" || o.kind === "high")) expect(o.length).toBe(BARRIER.depth);
  });
});

describe("the course can always be passed", () => {
  for (const seed of [1, 2, 3, 4]) {
    it(`by a careful runner on seed ${seed}`, () => {
      const run = botRun(seed, 5000);
      expect(run.crashed).toBeNull();
      expect(run.coins).toBeGreaterThan(100);
      // A long run with a bot thinking ahead: slow on a busy machine, so it gets a minute.
    }, 60_000);
  }
});
