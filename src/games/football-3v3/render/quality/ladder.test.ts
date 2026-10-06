import { describe, expect, it } from "vitest";
import { BUDGET_MS, climb, judge, LADDER, stepDown } from "./ladder";

describe("the quality ladder", () => {
  it("costs less on every rung down and never gets cheaper than six tenths with no extras", () => {
    for (let i = 1; i < LADDER.length; i++) {
      const a = LADDER[i - 1]!;
      const b = LADDER[i]!;
      const cheaper = b.scale < a.scale || b.tier.samples < a.tier.samples || b.tier.shadowLights < a.tier.shadowLights || (a.tier.bloom && !b.tier.bloom);
      expect(cheaper).toBe(true);
    }
    const last = LADDER[LADDER.length - 1]!;
    expect(last.scale).toBe(0.6);
    expect(last.tier.samples).toBe(0);
    expect(LADDER[0]!.tier.shadowLights).toBe(2);
  });

  it("walks down while frames run long, to the bottom rung", () => {
    const c = climb();
    for (let i = 0; i < 4000; i++) judge(c, 30);
    expect(c.rung).toBe(LADDER.length - 1);
  });

  it("holds inside the budget and climbs back once there is room", () => {
    const c = climb();
    for (let i = 0; i < 400; i++) judge(c, BUDGET_MS - 1);
    expect(c.rung).toBe(0);
    for (let i = 0; i < 300; i++) judge(c, 25);
    const low = c.rung;
    expect(low).toBeGreaterThan(0);
    for (let i = 0; i < 5000; i++) judge(c, 4);
    expect(c.rung).toBe(0);
  });

  it("ignores a single slow frame", () => {
    const c = climb();
    for (let i = 0; i < 100; i++) judge(c, 8);
    judge(c, 60);
    for (let i = 0; i < 10; i++) judge(c, 8);
    expect(c.rung).toBe(0);
  });

  it("does not bounce between two rungs when one is just too slow and the next has little room", () => {
    const c = climb();
    let changes = 0;
    for (let i = 0; i < 3000; i++) if (judge(c, c.rung === 0 ? 13 : 9)) changes++;
    expect(changes).toBe(1);
    expect(c.rung).toBe(1);
  });

  it("steps down one rung at a time without a timer, and stops at the bottom", () => {
    const c = climb();
    expect(stepDown(c)).toBe(true);
    expect(c.rung).toBe(1);
    for (let i = 0; i < 20; i++) stepDown(c);
    expect(c.rung).toBe(LADDER.length - 1);
    expect(stepDown(c)).toBe(false);
  });
});
