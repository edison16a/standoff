import { describe, expect, it } from "vitest";
import { BALL_DRAG, predict } from "./ball";
import { xFromGoal } from "./field";
import { goalResult, kickLength, kickVelocity, powerNeeded } from "./kick-flight";
import { aimError, aimMeter, inGreen, powerMeter } from "./meters";
import { v2, v3 } from "./vec";

/** A kick spot this many yards from the posts for Red, in the middle of the field. */
const spotFor = (length: number) => v2(xFromGoal(0, length - 10), 0);

describe("kicking bars", () => {
  it("sweep left to right and back, and power up and down", () => {
    expect(aimMeter(0)).toBeCloseTo(-1);
    expect(aimMeter(0.65)).toBeCloseTo(1);
    expect(aimMeter(1.3)).toBeCloseTo(-1);
    expect(powerMeter(0)).toBeCloseTo(0);
    expect(powerMeter(0.75)).toBeCloseTo(1);
  });

  it("send a green kick dead straight and an edge one well wide", () => {
    expect(inGreen(0.05)).toBe(true);
    expect(aimError(0.1)).toBe(0);
    expect(Math.abs(aimError(1))).toBeGreaterThan(0.1);
    expect(aimError(-1)).toBeCloseTo(-aimError(1));
  });
});

describe("field goals", () => {
  it("go through from an extra point distance with modest power", () => {
    expect(powerNeeded(0, spotFor(33))).not.toBeNull();
    expect(powerNeeded(0, spotFor(33))!).toBeLessThan(0.5);
  });

  it("need more power from further out, and have a limit near 60 yards", () => {
    expect(powerNeeded(0, spotFor(50))!).toBeGreaterThan(powerNeeded(0, spotFor(30))!);
    expect(powerNeeded(0, spotFor(56))).not.toBeNull();
    expect(powerNeeded(0, spotFor(68))).toBeNull();
  });

  it("miss wide off the edge of the accuracy bar, but not from the green", () => {
    const spot = spotFor(40);
    const from = v3(spot.x, 0.15, spot.z);
    expect(goalResult(0, from, kickVelocity("fieldgoal", 0, spot, 0.08, 0.9))).toBe("good");
    expect(goalResult(0, from, kickVelocity("fieldgoal", 0, spot, 1, 0.9))).toBe("wide");
    expect(goalResult(0, from, kickVelocity("fieldgoal", 0, spot, 0, 0.05))).toBe("short");
  });

  it("aim at the posts for Blue too", () => {
    const spot = v2(xFromGoal(1, 20), 2);
    expect(goalResult(1, v3(spot.x, 0.15, spot.z), kickVelocity("fieldgoal", 1, spot, 0, 0.8))).toBe("good");
    expect(kickLength(1, spot)).toBe(30);
  });
});

describe("punts", () => {
  it("fly a long way downfield at full power", () => {
    const vel = kickVelocity("punt", 0, v2(-30, 0), 0, 1);
    const land = predict(v3(-30, 0.15, 0), vel, BALL_DRAG.tumble, (2 * vel.y) / 10.73);
    expect(land.x - -30).toBeGreaterThan(40);
  });
});
