import { describe, expect, it } from "vitest";
import { ShowRun } from "./show-run";

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
});
