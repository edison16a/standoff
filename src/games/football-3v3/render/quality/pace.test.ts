import { describe, expect, it } from "vitest";
import { missing, PaceWatch } from "./pace";

const steady = (ms: number, n = 90) => Array.from({ length: n }, () => ms);

describe("watching the pace without a card timer", () => {
  it("reads a steady screen as fine, at its refresh or under a frame rate cap", () => {
    expect(missing(steady(16.7))).toBe(false);
    expect(missing(steady(33.3))).toBe(false);
    expect(missing(steady(8.3))).toBe(false);
  });

  it("reads frames that miss every other refresh as slow", () => {
    const gaps = steady(16.7, 30).concat(steady(33.4, 60));
    expect(missing(gaps)).toBe(true);
  });

  it("forgives a few dropped frames", () => {
    const gaps = steady(16.7, 80).concat(steady(33.4, 10));
    expect(missing(gaps)).toBe(false);
  });

  it("gives a verdict once a window fills, and ignores a hidden tab's long gap", () => {
    const watch = new PaceWatch();
    let t = 0;
    let verdicts = 0;
    for (let i = 0; i < 200; i++) {
      t += i % 2 === 0 ? 16.7 : 33.4;
      if (i === 50) t += 5000;
      if (watch.tick(t)) verdicts++;
    }
    expect(verdicts).toBeGreaterThan(0);
  });
});
