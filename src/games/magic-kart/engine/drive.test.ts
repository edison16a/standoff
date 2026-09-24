import { describe, expect, it } from "vitest";
import { baseTop, driftTier, gripOf } from "./drive";
import type { RaceEvent } from "./events";
import { createKart, forwardSpeed, type Kart, type KartInput } from "./kart";
import { driveKart, topSpeed } from "./physics";
import { OVAL } from "./test-track";
import { Track } from "./track";
import { DRIFT, STEP, SURGE } from "./tuning";

// A very wide road, so drifts and long runs have room.
const wide = new Track({ ...OVAL, width: 160 });
const FLAT_OUT: KartInput = { steer: 0, throttle: true, brake: false };

function run(kart: Kart, input: KartInput, seconds: number, events: RaceEvent[] = []): void {
  for (let t = 0; t < seconds; t += STEP) driveKart(kart, input, wide, STEP, (e) => events.push(e));
}

function atSpeed(seconds = 5): Kart {
  const kart = createKart(0, "nova", 1, wide, 2, 0);
  run(kart, FLAT_OUT, seconds);
  return kart;
}

describe("throttle", () => {
  it("builds speed over a few seconds rather than at once", () => {
    const kart = createKart(0, "nova", 1, wide, 2, 0);
    run(kart, FLAT_OUT, 1);
    expect(forwardSpeed(kart)).toBeLessThan(baseTop(kart) * 0.6);
    run(kart, FLAT_OUT, 3.5);
    expect(forwardSpeed(kart)).toBeGreaterThan(baseTop(kart) * 0.9);
  });

  it("surges past the usual top speed when Drive stays down, and loses it after lifting", () => {
    const kart = atSpeed(4);
    expect(kart.surge).toBe(0);
    run(kart, FLAT_OUT, SURGE.after + SURGE.build + 2);
    expect(kart.surge).toBe(1);
    expect(forwardSpeed(kart)).toBeGreaterThan(baseTop(kart) * (1 + SURGE.bonus * 0.8));
    expect(topSpeed(kart)).toBeCloseTo(baseTop(kart) * (1 + SURGE.bonus));
    run(kart, { steer: 0, throttle: false, brake: false }, 1.5);
    expect(kart.surge).toBe(0);
  });

  it("coasts down gently with no pedal", () => {
    const kart = atSpeed();
    const before = forwardSpeed(kart);
    run(kart, { steer: 0, throttle: false, brake: false }, 1);
    expect(forwardSpeed(kart)).toBeGreaterThan(before - 5);
  });
});

describe("brake", () => {
  it("bites softly on a tap and harder when held", () => {
    const kart = atSpeed();
    const before = forwardSpeed(kart);
    run(kart, { steer: 0, throttle: true, brake: true }, 0.2);
    const tapped = before - forwardSpeed(kart);
    expect(tapped).toBeGreaterThan(0.5);
    expect(tapped).toBeLessThan(3.5);
    run(kart, { steer: 0, throttle: false, brake: true }, 1.4);
    expect(forwardSpeed(kart)).toBeLessThan(1);
  });
});

describe("drifting", () => {
  it("starts when braking into a bend at speed, and glides rather than stopping", () => {
    const kart = atSpeed();
    const before = forwardSpeed(kart);
    const events: RaceEvent[] = [];
    run(kart, { steer: 0.8, throttle: false, brake: true }, 1, events);
    expect(events.some((e) => e.type === "drift" && e.on)).toBe(true);
    expect(kart.drift).toBe(1);
    // A drift sheds a few metres a second where a straight line stop would shed most of it.
    expect(forwardSpeed(kart)).toBeGreaterThan(before - DRIFT.brakeGlide * 1.3);
  });

  it("starts when lifting off with the wheel turned hard, and not when turned gently", () => {
    const gentle = atSpeed();
    run(gentle, { steer: 0.4, throttle: false, brake: false }, 0.5);
    expect(gentle.drift).toBe(0);
    const hard = atSpeed();
    run(hard, { steer: -0.9, throttle: false, brake: false }, 0.2);
    expect(hard.drift).toBe(-1);
  });

  it("holds its pace with Drive down, and pays a turbo when driven out of", () => {
    const kart = atSpeed();
    const events: RaceEvent[] = [];
    run(kart, { steer: 0.8, throttle: true, brake: true }, 2.2, events);
    expect(forwardSpeed(kart)).toBeGreaterThan(baseTop(kart) * 0.85);
    expect(driftTier(kart.driftTime)).toBe(2);
    driveKart(kart, FLAT_OUT, wide, STEP, (e) => events.push(e));
    expect(kart.drift).toBe(0);
    expect(events.some((e) => e.type === "boost" && e.source === "drift")).toBe(true);
    expect(kart.timers.boost).toBeCloseTo(DRIFT.orangeBoost, 1);
  });

  it("pays nothing for a flick too short to spark", () => {
    const kart = atSpeed();
    run(kart, { steer: 0.8, throttle: true, brake: true }, 0.3);
    run(kart, FLAT_OUT, STEP);
    expect(kart.drift).toBe(0);
    expect(kart.timers.boost).toBe(0);
  });

  it("charges through blue, orange and purple sparks", () => {
    expect([0.5, DRIFT.blueAt, DRIFT.orangeAt, DRIFT.purpleAt].map(driftTier)).toEqual([0, 1, 2, 3]);
  });

  it("grips less the faster it goes, so a quick kart swings wider", () => {
    const kart = atSpeed();
    kart.drift = 1;
    expect(gripOf(kart, baseTop(kart))).toBeLessThan(gripOf(kart, baseTop(kart) * 0.5));
  });

  it("turns tighter or wider with the wheel, but always into its bend", () => {
    const heading = (steer: number) => {
      const kart = atSpeed();
      run(kart, { steer: 0.8, throttle: true, brake: true }, 0.1);
      const from = kart.heading;
      run(kart, { steer, throttle: true, brake: true }, 0.5);
      return from - kart.heading;
    };
    const tight = heading(1);
    const open = heading(-1);
    expect(tight).toBeGreaterThan(open);
    expect(open).toBeGreaterThan(0);
  });
});
