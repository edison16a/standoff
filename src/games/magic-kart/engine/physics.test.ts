import { describe, expect, it } from "vitest";
import type { RaceEvent } from "./events";
import { createKart, forwardSpeed, speedOf, type Kart } from "./kart";
import { driveKart, topSpeed } from "./physics";
import { Track } from "./track";
import { OVAL } from "./test-track";
import { DRIVE, EFFECTS, STEP } from "./tuning";

const track = new Track(OVAL);
const run = (seconds: number, fn: () => void) => {
  for (let t = 0; t < seconds; t += STEP) fn();
};

/** Steering that holds the middle of the road, like a careful driver. */
function followRoad(kart: Kart, road: Track): number {
  const f = road.frameAt(kart.loc.s + 6);
  const diff = Math.atan2(Math.sin(Math.atan2(f.tx, f.tz) - kart.heading), Math.cos(Math.atan2(f.tx, f.tz) - kart.heading));
  return Math.max(-1, Math.min(1, -diff * 2.5 - kart.loc.d * 0.08));
}

describe("driving", () => {
  it("accelerates to top speed and no further", () => {
    const kart = createKart(0, "nova", 1, track, 5, 0);
    run(4.5, () => driveKart(kart, { steer: followRoad(kart, track), throttle: true, brake: false }, track, STEP, () => undefined));
    expect(speedOf(kart)).toBeGreaterThan(DRIVE.topSpeed * 0.9);
    expect(speedOf(kart)).toBeLessThanOrEqual(topSpeed(kart) + 0.01);
  });

  it("steers right with positive steer", () => {
    const kart = createKart(0, "pip", 1, track, 5, 0);
    const heading = kart.heading;
    run(1, () => driveKart(kart, { steer: 1, throttle: true, brake: false }, track, STEP, () => undefined));
    // Heading +z, turning right swings toward -x, which lowers the heading.
    expect(kart.heading).toBeLessThan(heading);
    expect(kart.x).toBeLessThan(0);
  });

  it("brakes, then reverses", () => {
    const kart = createKart(0, "blaze", 1, track, 5, 0);
    run(2, () => driveKart(kart, { steer: 0, throttle: true, brake: false }, track, STEP, () => undefined));
    run(3, () => driveKart(kart, { steer: 0, throttle: false, brake: true }, track, STEP, () => undefined));
    expect(forwardSpeed(kart)).toBeLessThan(0);
    expect(forwardSpeed(kart)).toBeGreaterThanOrEqual(-DRIVE.reverseSpeed - 0.01);
  });

  it("is slower on ice and faster while boosting", () => {
    const kart = createKart(0, "mochi", 1, track, 5, 0);
    const normal = topSpeed(kart);
    kart.timers.ice = 1;
    expect(topSpeed(kart)).toBeCloseTo(normal * EFFECTS.iceFactor);
    kart.timers.ice = 0;
    kart.timers.boost = 1;
    expect(topSpeed(kart)).toBeCloseTo(normal * EFFECTS.boostFactor);
  });

  it("cannot steer in the air", () => {
    const kart = createKart(0, "pip", 1, track, 5, 0);
    run(1, () => driveKart(kart, { steer: 0, throttle: true, brake: false }, track, STEP, () => undefined));
    kart.airborne = true;
    kart.y = 3;
    const heading = kart.heading;
    driveKart(kart, { steer: 1, throttle: true, brake: false }, track, STEP, () => undefined);
    expect(kart.heading).toBe(heading);
  });

  it("stays inside the barriers", () => {
    const kart = createKart(0, "blaze", 1, track, 30, 0);
    kart.heading += Math.PI / 2;
    run(3, () => driveKart(kart, { steer: 0, throttle: true, brake: false }, track, STEP, () => undefined));
    expect(Math.abs(kart.loc.d)).toBeLessThanOrEqual(track.edge);
  });

  it("drifts with brake and steer at speed, and a long drift pays a boost", () => {
    // A very wide road, so the drift has room to go round in circles.
    const wide = new Track({ ...OVAL, width: 160 });
    const kart = createKart(0, "nova", 1, wide, 2, 0);
    const events: RaceEvent[] = [];
    run(3, () => driveKart(kart, { steer: 0, throttle: true, brake: false }, wide, STEP, () => undefined));
    run(2.2, () => driveKart(kart, { steer: 0.8, throttle: true, brake: true }, wide, STEP, (e) => events.push(e)));
    expect(events.some((e) => e.type === "drift" && e.on)).toBe(true);
    driveKart(kart, { steer: 0, throttle: true, brake: false }, wide, STEP, (e) => events.push(e));
    expect(events.some((e) => e.type === "boost" && e.source === "drift")).toBe(true);
    expect(kart.timers.boost).toBeGreaterThan(0);
  });
});

describe("jumps", () => {
  it("launches off a ramp lip, flies over the gap and lands", () => {
    // Well down the first straight, so the kart reaches the lip near full speed.
    const jump = new Track({ ...OVAL, ramps: [{ at: 0.2, length: 12, height: 2.2 }], gaps: [{ at: 0.2, length: 10 }] });
    const kart = createKart(0, "blaze", 1, jump, 1, 0);
    const events: RaceEvent[] = [];
    run(11, () => driveKart(kart, { steer: kart.airborne ? 0 : followRoad(kart, jump), throttle: true, brake: false }, jump, STEP, (e) => events.push(e)));
    expect(events.some((e) => e.type === "jump")).toBe(true);
    expect(events.some((e) => e.type === "land")).toBe(true);
    expect(kart.airborne).toBe(false);
    expect(kart.loc.s).toBeGreaterThan(jump.gaps[0]!.end);
  });
});
