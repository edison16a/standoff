import { describe, expect, it, vi } from "vitest";
import { FrameCounter, fpsMeterShown, setFpsMeterShown, subscribeFpsMeter } from "./fps-meter";
import { createTapBurst } from "./tap-burst";

describe("tap burst", () => {
  it("fires on the third quick tap", () => {
    const tap = createTapBurst();
    expect(tap(0)).toBe(false);
    expect(tap(200)).toBe(false);
    expect(tap(400)).toBe(true);
  });

  it("starts over after a slow tap", () => {
    const tap = createTapBurst();
    tap(0);
    tap(200);
    expect(tap(1000)).toBe(false);
    expect(tap(1200)).toBe(false);
    expect(tap(1400)).toBe(true);
  });

  it("treats the tap after a burst as an ordinary one", () => {
    const tap = createTapBurst();
    tap(0);
    tap(100);
    tap(200);
    expect(tap(300)).toBe(false);
  });
});

describe("frame counter", () => {
  it("reports frames per second once a window closes", () => {
    const counter = new FrameCounter(500);
    const reports: number[] = [];
    for (let t = 0; t <= 1000; t += 1000 / 60) {
      const fps = counter.frame(t);
      if (fps !== null) reports.push(fps);
    }
    expect(reports.length).toBeGreaterThanOrEqual(1);
    for (const fps of reports) expect(fps).toBeCloseTo(60, 0);
  });
});

describe("frame rate readout switch", () => {
  it("tells listeners only when it changes", () => {
    const listener = vi.fn();
    const stop = subscribeFpsMeter(listener);
    setFpsMeterShown(true);
    setFpsMeterShown(true);
    expect(fpsMeterShown()).toBe(true);
    setFpsMeterShown(false);
    stop();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
