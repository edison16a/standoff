import { describe, expect, it } from "vitest";
import { SHOTS } from "./director";
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

  it("takes the clip's coins by touch, with jump boots for a short part", () => {
    const loop = SHOTS.loop;
    const show = new ShowRun(loop.seed, loop.warmup, { pickups: loop.pickups, powerSeconds: loop.powerSeconds });
    let touched = 0;
    let bootsS = 0;
    // The clip is captured from 3 to 12 seconds in.
    for (let t = 0; t < 12; t += 1 / 60) {
      for (const e of show.advance(1 / 60)) {
        expect(e.type === "power" ? e.kind : "boots").toBe("boots");
        if (e.type === "coin" && t > 3 && !e.pulled) touched++;
      }
      if (show.run.powers.has("boots")) bootsS += 1 / 60;
      expect(show.run.powers.has("magnet")).toBe(false);
    }
    expect(show.run.crashed).toBeFalsy();
    expect(touched).toBeGreaterThan(15);
    expect(bootsS).toBeGreaterThan(3);
    expect(bootsS).toBeLessThan(6);
  });
});
