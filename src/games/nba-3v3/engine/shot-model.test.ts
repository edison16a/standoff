import { describe, expect, it } from "vitest";
import { isThree, beyondArc } from "./court";
import { seeded } from "./rng";
import { GREEN_MS, gradeRelease, greenHalfMs, isMake, makeChance, pickOutcome, type ShotContext } from "./shot-model";

const open: ShotContext = { kind: "jumper", grade: "perfect", distance: 7, shooting: 7, contest: 0, strengthEdge: 0, onFire: false };

describe("the shot meter", () => {
  it("greens a release in the middle of the window and grades misses by side", () => {
    expect(gradeRelease(GREEN_MS, 5).grade).toBe("perfect");
    expect(gradeRelease(GREEN_MS - 400, 5).grade).toBe("early");
    expect(gradeRelease(GREEN_MS + 400, 5).grade).toBe("late");
    expect(gradeRelease(GREEN_MS + greenHalfMs(5) * 1.5, 5).grade).toBe("good");
  });

  it("gives better shooters, and anyone on fire, a wider green", () => {
    expect(greenHalfMs(10)).toBeGreaterThan(greenHalfMs(4));
    expect(greenHalfMs(6, true)).toBeGreaterThan(greenHalfMs(6));
  });
});

describe("the chance a shot goes in", () => {
  it("makes an open green nearly every time, and a contest cuts it", () => {
    expect(makeChance(open)).toBeGreaterThan(0.9);
    expect(makeChance({ ...open, contest: 1 })).toBeLessThan(makeChance(open) - 0.2);
  });

  it("ranks green over good over a mistimed release", () => {
    const good = makeChance({ ...open, grade: "good" });
    const early = makeChance({ ...open, grade: "early" });
    expect(makeChance(open)).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(early);
  });

  it("rewards the better shooter on a good release, and falls off from deep", () => {
    expect(makeChance({ ...open, grade: "good", shooting: 10 })).toBeGreaterThan(makeChance({ ...open, grade: "good", shooting: 4 }));
    expect(makeChance({ ...open, distance: 11 })).toBeLessThan(makeChance(open));
  });

  it("lets strength win at the rim", () => {
    const layup: ShotContext = { ...open, kind: "layup", distance: 1, contest: 0.8 };
    expect(makeChance({ ...layup, strengthEdge: 4 })).toBeGreaterThan(makeChance({ ...layup, strengthEdge: -4 }));
  });

  it("draws makes and misses of the right kind", () => {
    const rng = seeded(5);
    for (let i = 0; i < 50; i++) {
      expect(isMake(pickOutcome(rng, true, open, 0.5))).toBe(true);
      expect(isMake(pickOutcome(rng, false, open, 0.5))).toBe(false);
    }
  });
});

describe("the arc", () => {
  it("counts three from beyond the arc and from the corners", () => {
    expect(isThree({ x: 0, z: 9 })).toBe(true);
    expect(isThree({ x: 0, z: 6 })).toBe(false);
    expect(isThree({ x: 6.9, z: 1 })).toBe(true);
    expect(isThree({ x: 6.3, z: 1 })).toBe(false);
    expect(beyondArc({ x: 0, z: 8.6 })).toBe(true);
  });
});
