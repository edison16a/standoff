import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { PUNCHES, RULES } from "./rules";
import { fighting, hold, ofType, run } from "./test-helpers";

describe("the fight's flow", () => {
  it("rings the bell for round one after the intro when touching gloves is off", () => {
    const match = new Match({ seed: 1, introMs: 1000, touch: false });
    const events = run(match, 1100);
    expect(ofType(events, "round")).toEqual([{ type: "round", round: 1 }]);
    expect(ofType(events, "bell")[0]?.kind).toBe("start");
    expect(match.phase).toBe("fight");
  });

  it("knocks once with five seconds left", () => {
    const match = fighting({ roundMs: 8_000 });
    expect(ofType(run(match, 2500), "warning")).toHaveLength(0);
    expect(ofType(run(match, 1000), "warning")).toHaveLength(1);
  });

  it("stops everything while paused", () => {
    const match = fighting();
    const clock = match.roundClock;
    match.paused = true;
    expect(match.throwPunch(0, "left", "jab", 1)).toBe(false);
    run(match, 2000);
    expect(match.roundClock).toBe(clock);
  });
});

describe("punches", () => {
  it("lands a jab on a boxer who is not defending", () => {
    const match = fighting();
    expect(match.throwPunch(0, "left", "jab", 0.5)).toBe(true);
    const hits = ofType(run(match, 200), "hit");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.level).toBe("head");
    expect(match.fighters[1].health).toBeLessThan(RULES.maxHealth);
  });

  it("will not throw a second punch before the first lands", () => {
    const match = fighting();
    match.throwPunch(0, "right", "cross", 1);
    expect(match.throwPunch(0, "left", "jab", 1)).toBe(false);
  });

  it("empties the bar with about fifteen clean body shots, and a head shot does two to three times as much", () => {
    const body: number[] = [];
    const head: number[] = [];
    for (const style of ["jab", "cross", "hook"] as const) {
      for (const level of ["body", "head"] as const) {
        const match = fighting();
        match.throwPunch(0, style === "jab" ? "left" : "right", style, 0.5, 0, level);
        const hit = ofType(run(match, 300), "hit")[0]!;
        (level === "body" ? body : head).push(hit.damage);
      }
    }
    const mean = body.reduce((a, b) => a + b, 0) / body.length;
    expect(RULES.maxHealth / mean).toBeGreaterThan(13);
    expect(RULES.maxHealth / mean).toBeLessThan(17);
    head.forEach((damage, i) => {
      expect(damage / body[i]!).toBeGreaterThanOrEqual(2);
      expect(damage / body[i]!).toBeLessThanOrEqual(3);
    });
  });

  it("spoils a punch still winding up when its thrower is hit first", () => {
    const match = fighting();
    match.throwPunch(1, "right", "cross", 1, 600);
    match.throwPunch(0, "left", "jab", 1);
    const events = run(match, 900);
    expect(ofType(events, "interrupted")).toHaveLength(1);
    expect(ofType(events, "hit").every((hit) => hit.fighter === 0)).toBe(true);
  });

  it("makes tired punches weaker", () => {
    const fresh = fighting();
    fresh.throwPunch(0, "right", "cross", 1);
    const strong = ofType(run(fresh, 200), "hit")[0]!.damage;
    const tired = fighting();
    tired.fighters[0].stamina = 2;
    tired.throwPunch(0, "right", "cross", 1);
    const weak = ofType(run(tired, 300), "hit")[0]!.damage;
    expect(weak).toBeLessThan(strong * 0.6);
  });

  it("opens a counter window after a block, and a counter jab lands hard", () => {
    const match = fighting();
    hold(match, 1, { shell: "guard" });
    match.throwPunch(0, "right", "cross", 1);
    const events = run(match, 200);
    expect(ofType(events, "block")).toHaveLength(1);
    expect(ofType(events, "counter")[0]).toMatchObject({ fighter: 1, from: "block" });
    expect(match.fighters[1].health).toBeGreaterThan(RULES.maxHealth - PUNCHES.cross.damage * 0.2);
    hold(match, 1, {});
    match.throwPunch(1, "left", "jab", 0.5);
    const hit = ofType(run(match, 200), "hit")[0]!;
    expect(hit.counter).toBe(true);
    expect(hit.damage).toBeGreaterThan(PUNCHES.jab.damage * RULES.headDamage * 1.4);
  });
});
