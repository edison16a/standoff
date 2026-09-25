import { describe, expect, it } from "vitest";
import type { RaceEvent } from "./events";
import { airLeft, airVy, shouldDeploy } from "./glide";
import { createKart, speedOf, type Kart } from "./kart";
import { driveKart } from "./physics";
import { respawn } from "./respawn";
import { Track } from "./track";
import { OVAL } from "./test-track";
import { DRIVE, GLIDE, STEP } from "./tuning";

const flat = new Track(OVAL);
/** The oval with a glide jump on the first straight: a ramp, then a gap too long to clear without the wing. */
const jump = new Track({ ...OVAL, ramps: [{ at: 0.1, length: 14, height: 3 }], gaps: [{ at: 0.1, length: 26 }] });

/** A kart up to speed on the straight, `before` metres short of the ramp's lip. */
function atSpeed(track: Track, before: number): Kart {
  const lip = track.ramps[0]?.end ?? 80;
  const kart = createKart(0, "nova", 1, track, lip - before, 0);
  kart.vz = DRIVE.topSpeed;
  return kart;
}

function fly(kart: Kart, track: Track, seconds: number, steer = 0): RaceEvent[] {
  const events: RaceEvent[] = [];
  for (let t = 0; t < seconds; t += STEP) driveKart(kart, { steer, throttle: true, brake: false }, track, STEP, (e) => events.push(e));
  return events;
}

describe("when the glider opens", () => {
  it("opens off a jump ramp, a moment after the lip, and unfolds over about 0.3 s", () => {
    const kart = atSpeed(jump, 20);
    let openedAt = -1;
    for (let t = 0; t < 1.6 && openedAt < 0; t += STEP) {
      fly(kart, jump, STEP);
      if (kart.gliding) openedAt = kart.airTime;
    }
    expect(openedAt).toBeGreaterThanOrEqual(GLIDE.after);
    expect(openedAt).toBeLessThan(GLIDE.after + 0.05);
    fly(kart, jump, GLIDE.unfold / 2);
    expect(kart.glide).toBeGreaterThan(0.3);
    expect(kart.glide).toBeLessThan(0.8);
    fly(kart, jump, GLIDE.unfold);
    expect(kart.glide).toBe(1);
  });

  it("never opens for a small hop", () => {
    const kart = createKart(0, "pip", 1, flat, 40, 0);
    kart.airborne = true;
    kart.airTime = 0.15;
    kart.y = 0.3;
    kart.vy = 1;
    expect(shouldDeploy(kart, flat)).toBe(false);
  });

  it("does not open for the short drop back in after a respawn", () => {
    const kart = createKart(0, "mochi", 1, flat, 40, 0);
    respawn(kart, flat, { s: 60, d: 0 });
    const events = fly(kart, flat, 1);
    expect(events.some((e) => e.type === "glide")).toBe(false);
    expect(kart.airborne).toBe(false);
  });

  it("does not open for a kart rolling off an open edge into the drop", () => {
    const kart = createKart(0, "pip", 1, flat, 40, 0);
    kart.airborne = true;
    kart.airTime = 0.7;
    kart.y = flat.frameAt(kart.loc.s).y - 2;
    kart.vy = -12;
    expect(shouldDeploy(kart, flat)).toBe(false);
  });

  it("reckons the time left in the air from height and climb", () => {
    const kart = createKart(0, "blaze", 1, flat, 40, 0);
    kart.airborne = true;
    kart.y = 3;
    expect(airLeft(kart, flat)).toBeCloseTo(Math.sqrt((2 * 3) / DRIVE.gravity), 2);
    kart.vy = 6;
    expect(airLeft(kart, flat)).toBeGreaterThan(0.6);
  });
});

describe("gliding", () => {
  it("carries the kart over a gap it could not jump, then folds on landing", () => {
    const kart = atSpeed(jump, 20);
    const events = fly(kart, jump, 5);
    const types = events.map((e) => e.type);
    expect(types).toContain("jump");
    const opened = types.indexOf("glide");
    const landed = types.indexOf("land");
    expect(opened).toBeGreaterThan(-1);
    expect(landed).toBeGreaterThan(opened);
    expect(events.find((e) => e.type === "glide" && !e.open)).toBeDefined();
    expect(kart.airborne).toBe(false);
    expect(kart.gliding).toBe(false);
    expect(jump.forward(jump.gaps[0]!.end, kart.loc.s)).toBeGreaterThan(0);
  });

  it("falls slower than a plain jump, and a steady sink caps the fall", () => {
    const kart = createKart(0, "nova", 1, flat, 40, 0);
    kart.vz = DRIVE.topSpeed;
    kart.airborne = true;
    kart.vy = -2;
    const plain = airVy(kart, 0.1);
    kart.glide = 1;
    expect(airVy(kart, 0.1)).toBeGreaterThan(plain);
    kart.vy = -20;
    for (let t = 0; t < 2; t += STEP) kart.vy = airVy(kart, STEP);
    expect(kart.vy).toBeGreaterThan(-GLIDE.sink - 0.2);
  });

  it("stays in the air far longer than the same jump without the wing", () => {
    const kart = atSpeed(jump, 20);
    fly(kart, jump, 0.95);
    expect(kart.gliding).toBe(true);
    let air = kart.airTime;
    for (let t = 0; t < 5 && kart.airborne; t += STEP) {
      fly(kart, jump, STEP);
      air = kart.airTime;
    }
    // A plain arc off this ramp lands in under a second.
    expect(air).toBeGreaterThan(1.3);
  });

  it("steers with the phone the same way as on the road", () => {
    const right = atSpeed(jump, 20);
    const left = atSpeed(jump, 20);
    fly(right, jump, 0.9);
    fly(left, jump, 0.9);
    const heading = right.heading;
    fly(right, jump, 0.5, 1);
    fly(left, jump, 0.5, -1);
    expect(right.heading).toBeLessThan(heading);
    expect(left.heading).toBeGreaterThan(heading);
    // Gentle, not the snap of full lock on tarmac.
    expect(heading - right.heading).toBeLessThan(DRIVE.turnRate * 0.5);
    expect(right.loc.d).toBeGreaterThan(left.loc.d);
  });

  it("holds its pace, and eases a boosted launch back to cruise", () => {
    const kart = atSpeed(jump, 20);
    fly(kart, jump, 0.9);
    const before = speedOf(kart);
    fly(kart, jump, 0.6);
    expect(speedOf(kart)).toBeGreaterThan(before * 0.9);
    kart.vz *= 1.5;
    const boosted = speedOf(kart);
    fly(kart, jump, 0.5);
    expect(speedOf(kart)).toBeLessThan(boosted);
  });

  it("cannot be steered while spun out, though the wing stays open", () => {
    const kart = atSpeed(jump, 20);
    fly(kart, jump, 0.9);
    kart.timers.stun = 1;
    const heading = kart.heading;
    fly(kart, jump, 0.3, 1);
    expect(kart.heading).toBeCloseTo(heading, 5);
    expect(kart.gliding).toBe(true);
  });
});
