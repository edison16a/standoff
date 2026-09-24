import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "@/shared/tuning";
import { PositionTracker } from "./position-tracker";

const STEP = 1000 / 60;

/** Feeds a constant acceleration for a duration, returning the last intent. */
function drive(tracker: PositionTracker, clock: { t: number }, accel: number, ms: number) {
  let intent = 0;
  for (const end = clock.t + ms; clock.t < end; clock.t += STEP) {
    intent = tracker.update({ t: clock.t, forwardAccel: accel, accelMagnitude: Math.abs(accel), roll: 0 });
  }
  return intent;
}

describe("PositionTracker", () => {
  it("holds a forward offset after the arm pushes out and stops", () => {
    const tracker = new PositionTracker(DEFAULT_TUNING);
    const clock = { t: 0 };
    drive(tracker, clock, 3, 250);
    drive(tracker, clock, -3, 250);
    const held = drive(tracker, clock, 0, 600);
    expect(tracker.offset).toBeGreaterThan(0.1);
    expect(held).toBeGreaterThan(0.4);
    // Still holding a second later: the intent does not decay.
    expect(drive(tracker, clock, 0, 1000)).toBeCloseTo(held, 5);
  });

  it("snaps velocity to zero when the phone is still, so noise cannot run away", () => {
    const tracker = new PositionTracker(DEFAULT_TUNING);
    const clock = { t: 0 };
    for (let i = 0; i < 300; i++, clock.t += STEP) {
      const noise = (i % 2 === 0 ? 1 : -1) * 0.05 + 0.02;
      tracker.update({ t: clock.t, forwardAccel: noise, accelMagnitude: Math.abs(noise), roll: 0 });
    }
    expect(Math.abs(tracker.offset)).toBeLessThan(0.01);
  });

  it("recenters to zero", () => {
    const tracker = new PositionTracker(DEFAULT_TUNING);
    const clock = { t: 0 };
    drive(tracker, clock, -3, 250);
    tracker.recenter();
    expect(tracker.offset).toBe(0);
  });

  it("rewinds a strike out of the tracked offset", () => {
    const tracker = new PositionTracker(DEFAULT_TUNING);
    const clock = { t: 0 };
    drive(tracker, clock, 0, 300);
    const strikeStart = clock.t;
    drive(tracker, clock, 25, 100);
    tracker.hold(strikeStart, clock.t + 350);
    drive(tracker, clock, -25, 100);
    drive(tracker, clock, 0, 600);
    expect(Math.abs(tracker.offset)).toBeLessThan(0.01);
  });
});
