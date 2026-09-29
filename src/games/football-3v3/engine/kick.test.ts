import { describe, expect, it } from "vitest";
import { inGreen, meterAim, meterPower } from "./kick";
import { puntCarry } from "./kick-flight";
import { KICK, RULES } from "./tuning";
import { bySeat, peopleMatch, run, setDrive } from "./test-helpers";

describe("kick meters", () => {
  it("sweeps accuracy left to right and back", () => {
    expect(meterAim(0)).toBeCloseTo(-1);
    expect(meterAim(KICK.aimPeriod / 4)).toBeCloseTo(0);
    expect(meterAim(KICK.aimPeriod / 2)).toBeCloseTo(1);
    expect(meterAim(KICK.aimPeriod)).toBeCloseTo(-1);
  });

  it("climbs power from the bottom to the top and back", () => {
    expect(meterPower(0)).toBeCloseTo(0);
    expect(meterPower(KICK.powerPeriod / 2)).toBeCloseTo(1);
    expect(meterPower(KICK.powerPeriod * 0.75)).toBeCloseTo(0.5);
  });

  it("has a green zone in the middle", () => {
    expect(inGreen(0.05)).toBe(true);
    expect(inGreen(-0.5)).toBe(false);
  });
});

describe("kicking", () => {
  function kickFrom(yardline: number, aim: number, power: number) {
    const m = peopleMatch();
    setDrive(m, 0, yardline, 4);
    const qb = bySeat(m, 0);
    m.choose(qb.id, "kick");
    expect(m.phase).toBe("kick");
    m.press(qb.id, "kick", aim);
    m.press(qb.id, "kick", power);
    const events = run(m, 8, () => m.phase === "dead");
    return { m, events };
  }

  it("splits the posts from close range with a green, strong kick", () => {
    const { m, events } = kickFrom(80, 0, 0.9);
    expect(events.find((e) => e.type === "fieldGoal")).toMatchObject({ good: true });
    expect(m.score).toEqual([3, 0]);
    run(m, RULES.deadSeconds + 0.1);
    expect(m.drive.offense).toBe(1);
    expect(m.drive.los).toBe(RULES.driveStart);
  });

  it("hooks wide when the accuracy marker stops at the edge", () => {
    const { m, events } = kickFrom(80, 1, 0.9);
    expect(events.find((e) => e.type === "fieldGoal")).toMatchObject({ good: false });
    expect(m.score).toEqual([0, 0]);
    run(m, RULES.deadSeconds + 0.1);
    // A miss gives the ball back at the line.
    expect(m.drive.offense).toBe(1);
    expect(m.drive.los).toBe(20);
  });

  it("falls short with too little power", () => {
    const { events } = kickFrom(62, 0, 0.1);
    expect(events.find((e) => e.type === "fieldGoal")).toMatchObject({ good: false });
  });

  it("punts from deep and hands the ball over far downfield", () => {
    const { m, events } = kickFrom(20, 0, 1);
    const punt = events.find((e) => e.type === "punt");
    expect(punt).toBeDefined();
    run(m, RULES.deadSeconds + 0.1);
    expect(m.drive.offense).toBe(1);
    expect(m.drive.los).toBeLessThan(55);
  });

  it("carries a harder punt farther", () => {
    expect(puntCarry(1, 7)).toBeGreaterThan(puntCarry(0.4, 7));
    expect(puntCarry(1, 10)).toBeGreaterThan(40);
  });
});
