import { describe, expect, it } from "vitest";
import { PLANS } from "./plans";
import { planLength, shotAt, type Plan } from "./shots";

const rig = { kind: "chase", back: 8, side: 0, height: 2, fov: 55 } as const;
const loop: Plan = {
  lead: 3,
  shots: [
    { map: "beach", seed: 1, from: 10, length: 1, rig },
    { map: "space", seed: 2, from: 20, length: 2, rate: 0.5, rig },
  ],
};

describe("shotAt", () => {
  it("starts the first shot once the lead has run, and wraps round", () => {
    expect(shotAt(loop, 3)).toEqual({ shot: loop.shots[0], time: 0 });
    expect(shotAt(loop, 6)).toEqual(shotAt(loop, 3));
    expect(shotAt(loop, 7.5)).toEqual(shotAt(loop, 4.5));
  });

  it("runs a slow motion shot at its rate", () => {
    const at = shotAt(loop, 5);
    expect(at.shot).toBe(loop.shots[1]);
    expect(at.time).toBeCloseTo(0.5);
  });

  it("plays a still in and then holds it", () => {
    const still: Plan = { shots: [loop.shots[0]!], freeze: 2 };
    expect(shotAt(still, 0).time).toBeCloseTo(0.8);
    expect(shotAt(still, 30).time).toBe(2);
  });
});

describe("the showcase loop", () => {
  it("runs exactly the eight seconds the capture tool records, so it loops without a seam", () => {
    expect(planLength(PLANS.loop)).toBeCloseTo(8, 6);
  });

  it("cuts on whole recorded frames", () => {
    for (const shot of PLANS.loop.shots) expect(Math.abs(shot.length * 30 - Math.round(shot.length * 30))).toBeLessThan(1e-6);
  });
});
