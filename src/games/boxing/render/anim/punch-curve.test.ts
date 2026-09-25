import { describe, expect, it } from "vitest";
import type { ActivePunch } from "../../engine/fighter";
import { punchShape } from "./punch-curve";

const punch = (windup: number): ActivePunch => ({
  hand: "right",
  style: "cross",
  level: "head",
  launchAt: 1000 + windup,
  aim: { x: 0, y: 0 },
  power: 1,
  start: 1000,
  impactAt: 1000 + windup + 140,
  endAt: 1000 + windup + 140 + 320,
  counter: false,
  tired: false,
  resolved: false,
});

describe("the punch curve", () => {
  it("winds up, drives out to land exactly on impact, then comes home", () => {
    const p = punch(600);
    expect(punchShape(p, 1000).extend).toBe(0);
    expect(punchShape(p, 1400).cock).toBeGreaterThan(0.9);
    expect(punchShape(p, 1400).extend).toBe(0);
    expect(punchShape(p, 1700).extend).toBeGreaterThan(0.4);
    expect(punchShape(p, 1740).extend).toBe(1);
    expect(punchShape(p, 1790).extend).toBe(1);
    expect(punchShape(p, 2059).extend).toBeLessThan(0.05);
    expect(punchShape(p, 2100).extend).toBe(0);
  });

  it("accelerates into the target", () => {
    const p = punch(0);
    const early = punchShape(p, 1035).extend - punchShape(p, 1000).extend;
    const late = punchShape(p, 1140).extend - punchShape(p, 1105).extend;
    expect(late).toBeGreaterThan(early);
  });

  it("counts down to the impact", () => {
    expect(punchShape(punch(0), 1040).toImpact).toBeCloseTo(0.1, 5);
  });
});
