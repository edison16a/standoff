import { describe, expect, it } from "vitest";
import { planLength, shotAt, type Plan } from "./plan";

const wide = { kind: "wide" } as const;
const loop: Plan = {
  lead: 3,
  shots: [
    { seed: 1, from: 10, length: 1, rig: wide },
    { seed: 1, from: 20, length: 2, rate: 0.5, rig: wide },
  ],
};

describe("shotAt", () => {
  it("adds up the shots' screen time", () => {
    expect(planLength(loop)).toBe(3);
  });

  it("starts the first shot once the lead has run", () => {
    expect(shotAt(loop, 3)).toEqual({ shot: loop.shots[0], time: 0 });
    expect(shotAt(loop, 3.5).time).toBeCloseTo(0.5);
  });

  it("runs a slow motion shot at its rate", () => {
    const at = shotAt(loop, 5);
    expect(at.shot).toBe(loop.shots[1]);
    expect(at.time).toBeCloseTo(0.5);
  });

  it("wraps round, so the end of the loop runs into its start", () => {
    expect(shotAt(loop, 6)).toEqual(shotAt(loop, 3));
    expect(shotAt(loop, 7.25)).toEqual(shotAt(loop, 4.25));
    // Before the lead the loop is already playing its last shot, ready to cut to the first.
    expect(shotAt(loop, 2.5).shot).toBe(loop.shots[1]);
  });

  it("plays a still in and then holds it", () => {
    const still: Plan = { shots: [{ seed: 1, from: 5, length: 3, rig: wide }], freeze: 2 };
    expect(shotAt(still, 0).time).toBeCloseTo(0.5);
    expect(shotAt(still, 1).time).toBeCloseTo(1.5);
    expect(shotAt(still, 10).time).toBe(2);
  });
});
