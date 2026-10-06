import { describe, expect, it } from "vitest";
import { createAthlete } from "../body";
import { catchOdds, type CatchTry } from "./odds";
import { HANDS, meetHands, reachOf, segmentGap } from "./reach";

const sure: CatchTry = { stretch: 0.1, speed: 15, facing: 1, contest: 9, diving: false, hands: 6 };

describe("the hands' reach", () => {
  it("measures the closest approach of two segments", () => {
    const g = segmentGap({ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0.5 }, { x: 0, y: 1, z: 0.5 });
    expect(g.d).toBeCloseTo(0.5);
    expect(g.s).toBeCloseTo(0.5);
    const apart = segmentGap({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 3, y: 1, z: 0 });
    expect(apart.d).toBeCloseTo(2);
  });

  it("reaches from the hips to a leap over the head, wider for good hands", () => {
    const wr = createAthlete(0, 0, "runner", 0, "routerunner", null);
    const back = createAthlete(1, 0, "runner", 1, "powerback", null);
    const r = reachOf(wr);
    expect(r.low.y).toBeCloseTo(HANDS.low);
    expect(r.high.y + r.radius).toBeGreaterThan(HANDS.high);
    expect(r.high.y + r.radius).toBeLessThan(HANDS.high + 0.35);
    expect(r.radius).toBeGreaterThan(reachOf(back).radius);
  });

  it("finds a ball passing through the reach this sub step", () => {
    const wr = createAthlete(0, 0, "runner", 0, "routerunner", null);
    const r = reachOf(wr);
    const through = meetHands({ x: -0.3, y: 1.4, z: 0.1 }, { x: 0.3, y: 1.35, z: 0.1 }, r);
    expect(through.gap).toBeLessThan(r.radius);
    const over = meetHands({ x: -0.3, y: 3.6, z: 0 }, { x: 0.3, y: 3.5, z: 0 }, r);
    expect(over.gap).toBeGreaterThan(r.radius);
  });
});

describe("the odds of holding on", () => {
  it("are near certain for a soft ball into the chest of a player facing it", () => {
    expect(catchOdds(sure)).toBeGreaterThan(0.93);
  });

  it("drop at full stretch, for a bullet, over the shoulder, from behind and with a defender in there", () => {
    const base = catchOdds(sure);
    expect(catchOdds({ ...sure, stretch: 1 })).toBeLessThan(base * 0.8);
    expect(catchOdds({ ...sure, speed: 29 })).toBeLessThan(base * 0.8);
    expect(catchOdds({ ...sure, facing: 0 })).toBeLessThan(base);
    expect(catchOdds({ ...sure, facing: -1 })).toBeLessThan(catchOdds({ ...sure, facing: 0 }));
    expect(catchOdds({ ...sure, contest: 0.1 })).toBeLessThan(base * 0.8);
  });

  it("are better with better hands", () => {
    expect(catchOdds({ ...sure, hands: 10, stretch: 0.8 })).toBeGreaterThan(catchOdds({ ...sure, hands: 3, stretch: 0.8 }));
  });
});
