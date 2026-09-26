import { describe, expect, it } from "vitest";
import { countRate, estimateRate, FALLBACK_RATE, measureRefreshRate, median, settledRate, snapRate } from "./refresh-rate";

/** About a second of callback times at a rate, with a small repeatable wobble. */
function stamps(hz: number, jitter = 0.4, seconds = 1): number[] {
  const period = 1000 / hz;
  return Array.from({ length: Math.round(hz * seconds) + 1 }, (_, i) => 5 + i * period + Math.sin(i * 7.3) * jitter);
}

describe("median", () => {
  it("takes the middle value", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});

describe("snapRate", () => {
  it.each([
    [59.94, 60],
    [61.2, 60],
    [74.2, 75],
    [89.1, 90],
    [119.3, 120],
    [143.8, 144],
    [164.6, 165],
    [238.5, 240],
  ])("snaps %f to %i", (fps, want) => expect(snapRate(fps)).toBe(want));

  it("rounds a rate far from any common one", () => {
    expect(snapRate(110)).toBe(110);
  });

  it("falls back to 60 when nothing was measured", () => {
    expect(snapRate(NaN)).toBe(FALLBACK_RATE);
    expect(snapRate(0)).toBe(FALLBACK_RATE);
  });
});

describe("estimateRate", () => {
  it.each([60, 75, 90, 120, 144, 165, 240])("finds a %i Hz screen", (hz) => {
    expect(estimateRate(stamps(hz))).toBe(hz);
  });

  it("is not pulled down by dropped frames on a busy page", () => {
    const busy = stamps(144).filter((_, i) => i % 9 !== 4);
    expect(countRate(busy)).toBeGreaterThan(140);
    expect(estimateRate(busy)).toBe(144);
  });

  it("is not pulled down by one long stall", () => {
    const times = stamps(120);
    const stalled = times.map((t, i) => (i > 40 ? t + 200 : t));
    expect(estimateRate(stalled)).toBe(120);
  });
});

describe("measureRefreshRate", () => {
  it("counts callbacks for about a second", async () => {
    const period = 1000 / 144;
    let now = 0;
    let calls = 0;
    const raf = (callback: FrameRequestCallback) => {
      calls++;
      now += period;
      queueMicrotask(() => callback(now));
      return calls;
    };
    await expect(measureRefreshRate(raf)).resolves.toBe(144);
    expect(calls).toBeGreaterThanOrEqual(144);
    expect(calls).toBeLessThan(150);
  });
});

describe("settledRate", () => {
  it("trusts real screen rates and retries a stalled reading", () => {
    expect(settledRate(60)).toBe(true);
    expect(settledRate(50)).toBe(true);
    expect(settledRate(29)).toBe(false);
  });
});
