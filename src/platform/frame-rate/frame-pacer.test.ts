import { describe, expect, it } from "vitest";
import { FramePacer } from "./frame-pacer";

/** Refresh timestamps at a given rate, with a repeatable wobble in milliseconds. */
function refreshes(hz: number, seconds: number, jitter = 0): number[] {
  const period = 1000 / hz;
  const count = Math.round(hz * seconds);
  return Array.from({ length: count }, (_, i) => i * period + (jitter ? Math.sin(i * 12.9898) * jitter : 0));
}

/** Runs the pacer over refreshes and returns the indices of those that ran a frame. */
function paced(hz: number, fps: number, seconds: number, jitter = 0): { stamps: number[]; picked: number[] } {
  const stamps = refreshes(hz, seconds, jitter);
  const pacer = new FramePacer(fps, hz);
  const picked = stamps.flatMap((now, i) => (pacer.tick(now) ? [i] : []));
  return { stamps, picked };
}

const gapsOf = (picked: number[]) => picked.slice(1).map((index, i) => index - (picked[i] ?? index));

describe("FramePacer", () => {
  it("halves 120 Hz into an even 60", () => {
    const { picked } = paced(120, 60, 2);
    expect(new Set(gapsOf(picked))).toEqual(new Set([2]));
    expect(picked).toHaveLength(120);
  });

  it("holds 60 Hz to 30 with every other refresh", () => {
    expect(new Set(gapsOf(paced(60, 30, 2).picked))).toEqual(new Set([2]));
  });

  it.each([
    [144, 60],
    [144, 90],
    [165, 120],
    [240, 90],
    [75, 60],
    [90, 60],
  ])("spreads %i Hz held to %i fairly, with no drift", (hz, fps) => {
    const seconds = 10;
    const { stamps, picked } = paced(hz, fps, seconds, 0.8);
    // The count matches the target over a long run.
    expect(Math.abs(picked.length - fps * seconds)).toBeLessThanOrEqual(1);
    // Gaps only ever use the two nearest whole numbers of refreshes.
    const ratio = hz / fps;
    for (const gap of gapsOf(picked)) expect([Math.floor(ratio), Math.ceil(ratio)]).toContain(gap);
    // Every frame sits within one refresh of its exact due time, all the way through.
    const interval = 1000 / fps;
    picked.forEach((index, k) => expect(Math.abs((stamps[index] ?? NaN) - k * interval)).toBeLessThan(1000 / hz + 1));
  });

  it("runs every refresh when the cap is at or above the screen", () => {
    expect(paced(60, 60, 1, 0.5).picked).toHaveLength(60);
    expect(paced(60, 120, 1).picked).toHaveLength(60);
  });

  it("starts over after a stall instead of bursting to catch up", () => {
    const pacer = new FramePacer(60, 120);
    const period = 1000 / 120;
    let t = 0;
    for (let i = 0; i < 20; i++, t += period) pacer.tick(t);
    // Half a second with no refreshes, then steady ones again.
    t += 500;
    const after: boolean[] = [];
    for (let i = 0; i < 8; i++, t += period) after.push(pacer.tick(t));
    expect(after).toEqual([true, false, true, false, true, false, true, false]);
  });

  it("learns the real refresh period and ignores a dropped refresh", () => {
    const pacer = new FramePacer(60, 60);
    const period = 1000 / 144;
    let t = 0;
    for (let i = 0; i < 30; i++) {
      pacer.tick(t);
      t += i === 20 ? period * 2 : period;
    }
    expect(pacer.refreshPeriod).toBeCloseTo(period, 5);
  });

  it("takes a new rate from the next refresh", () => {
    const pacer = new FramePacer(30, 120);
    const period = 1000 / 120;
    const ran = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => pacer.tick((from + i) * period)).filter(Boolean).length;
    expect(ran(0, 24)).toBe(6);
    pacer.setRate(60);
    expect(ran(24, 24)).toBe(12);
  });
});
