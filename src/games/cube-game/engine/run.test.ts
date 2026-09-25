import { describe, expect, it } from "vitest";
import { Autoplay } from "./autoplay";
import { LevelBuilder } from "./builder";
import { Run } from "./run";
import { LEVELS, levelById } from "../levels";

const INFO = { id: "test", name: "Test", difficulty: 1, bpm: 120, theme: "test" } as const;

function level() {
  const b = new LevelBuilder(INFO, 10);
  b.jump(8).spikes(b.apex(8));
  b.jump(16).spikes(b.apex(16));
  return b.end(24).build();
}

describe("a run", () => {
  it("counts attempts and keeps the best percent", () => {
    const run = new Run(level());
    run.advanceTo(10);
    expect(run.dead).toBe(true);
    const best = run.best;
    expect(best).toBeGreaterThan(0);
    expect(run.respawn()).toBe(0);
    expect(run.attempt).toBe(2);
    expect(run.best).toBe(best);
  });

  it("in practice comes back at a checkpoint safely before the crash", () => {
    const run = new Run(level(), true);
    run.press(4);
    run.advanceTo(10);
    expect(run.dead).toBe(true);
    const from = run.respawn();
    expect(from).toBeGreaterThan(4);
    expect(from).toBeLessThan(run.level.solution[1]! * 0.5);
    run.press(8);
    run.advanceTo(20);
    expect(run.finished).toBe(true);
  });

  it("takes a press at the exact time it was made, however late the frame", () => {
    const run = new Run(level());
    run.press(4);
    run.press(8);
    // One enormous frame, as on a stalled tab.
    run.advanceTo(13);
    expect(run.finished).toBe(true);
  });
});

describe("the computer player", () => {
  for (const { info } of LEVELS) {
    it(`finishes ${info.name}`, () => {
      const bot = new Autoplay(levelById(info.id));
      for (let t = 0; t < 200 && !bot.run.finished && !bot.run.dead; t += 1 / 30) bot.advanceTo(t);
      expect(bot.run.finished).toBe(true);
    });
  }
});
