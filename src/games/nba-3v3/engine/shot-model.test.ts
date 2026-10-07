import { describe, expect, it } from "vitest";
import { isThree, beyondArc } from "./court";
import { GREEN_MS, gradeRelease, greenHalfMs, isMake, makeChance, type ShotContext } from "./shot-model";

const open: ShotContext = { kind: "jumper", grade: "perfect", distance: 7, shooting: 7, contest: 0, strengthEdge: 0, onFire: false };

describe("the shot meter", () => {
  it("greens a release in the middle of the window and grades misses by side", () => {
    expect(gradeRelease(GREEN_MS + greenHalfMs(5) * 0.6, 5).grade).toBe("perfect");
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

  it("makes a three lean on the green more than a two", () => {
    const two = { ...open, grade: "good" as const, distance: 5 };
    const three = { ...two, distance: 7 };
    expect(makeChance(three)).toBeLessThan(makeChance(two) * 0.8);
    // On the green a three is as good as a two from that range.
    expect(makeChance({ ...three, grade: "perfect" })).toBeCloseTo(makeChance({ ...two, grade: "perfect" }), 5);
  });

  it("lets strength win at the rim", () => {
    const layup: ShotContext = { ...open, kind: "layup", distance: 1, contest: 0.8 };
    expect(makeChance({ ...layup, strengthEdge: 4 })).toBeGreaterThan(makeChance({ ...layup, strengthEdge: -4 }));
  });

  it("names the makes and the misses apart", () => {
    for (const outcome of ["swish", "bank", "roll", "bounce"] as const) expect(isMake(outcome)).toBe(true);
    for (const outcome of ["rimOut", "boardOut", "inOut", "airball"] as const) expect(isMake(outcome)).toBe(false);
  });

  it("makes an off balance jumper with a hand in the face a poor shot, but never touches gold", () => {
    const set: ShotContext = { ...open, grade: "good", contest: 0.6 };
    const falling = { ...set, offBalance: 1 };
    expect(makeChance(falling)).toBeLessThan(makeChance(set) * 0.8);
    // Open, being off balance costs only a little.
    expect(makeChance({ ...falling, contest: 0 })).toBeGreaterThan(makeChance({ ...set, contest: 0 }) * 0.85);
    expect(makeChance({ ...falling, grade: "gold", contest: 1 })).toBe(1);
    // A green in the face drops under half; open it is nearly sure.
    expect(makeChance({ ...open, contest: 1 })).toBeLessThan(0.5);
    expect(makeChance({ ...open, contest: 0 })).toBeGreaterThan(0.9);
  });

  it("gives a floater a fair chance over a big man", () => {
    const floater: ShotContext = { ...open, distance: 3.6, grade: "good", contest: 0.6, floater: true };
    expect(makeChance(floater)).toBeGreaterThan(makeChance({ ...floater, floater: false }));
    expect(makeChance(floater)).toBeLessThan(0.8);
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
