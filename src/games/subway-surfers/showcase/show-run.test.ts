import { describe, expect, it } from "vitest";
import { ShowRun } from "./show-run";
import { TRAILER } from "./trailer";

describe("showcase run", () => {
  it("adds up frames shorter than a step, so a fast display still moves it", () => {
    const show = new ShowRun(7, 1);
    const from = show.run.runner.distance;
    // Sixty frames of 16 milliseconds, as a faked clock or a fast screen gives.
    for (let i = 0; i < 60; i++) show.advance(0.016);
    expect(show.run.runner.distance - from).toBeGreaterThan(9);
  });

  it("plays the same run every time", () => {
    const a = new ShowRun(7, 5);
    const b = new ShowRun(7, 5);
    expect(b.run.runner).toEqual(a.run.runner);
    expect(b.run.score).toBe(a.run.score);
  });

  it("plays every trailer cut clean, with its power up and the chase where the cut wants them", () => {
    for (const cut of TRAILER) {
      const show = new ShowRun(cut.seed, cut.from, { pickups: cut.pickups ?? null });
      if (cut === TRAILER[0]) expect(show.run.chase.close).toBe(true);
      const powers = new Set<string>();
      for (let t = 0; t < cut.seconds * (cut.rate ?? 1); t += 1 / 60) {
        show.advance(1 / 60);
        for (const kind of show.run.powers.active()) powers.add(kind);
      }
      expect(show.run.crashed, `seed ${cut.seed} at ${cut.from}`).toBeFalsy();
      if (cut.pickups) expect(powers.has(cut.pickups), `seed ${cut.seed} at ${cut.from}`).toBe(true);
    }
  });
});
