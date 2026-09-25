import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { PUNCHES, RULES } from "./rules";
import { fighting, hold, ofType, run } from "./test-helpers";

describe("the fight's flow", () => {
  it("rings the bell for round one after the intro", () => {
    const match = new Match({ seed: 1, introMs: 1000 });
    const events = run(match, 1100);
    expect(ofType(events, "round")).toEqual([{ type: "round", round: 1 }]);
    expect(ofType(events, "bell")[0]?.kind).toBe("start");
    expect(match.phase).toBe("fight");
  });

  it("takes a break between rounds and scores a decision after the last", () => {
    const match = fighting({ roundMs: 3000, breakMs: 1000, rounds: 2 });
    const events = run(match, 3100);
    expect(match.phase).toBe("break");
    expect(ofType(events, "bell").map((b) => b.kind)).toContain("end");
    run(match, 1100);
    expect(match.round).toBe(2);
    expect(match.phase).toBe("fight");
    const rest = run(match, 3100);
    expect(match.phase).toBe("over");
    expect(match.result?.method).toBe("Draw");
    expect(ofType(rest, "bell").map((b) => b.kind)).toContain("final");
  });

  it("knocks once with ten seconds left", () => {
    const match = fighting({ roundMs: 12_000 });
    expect(ofType(run(match, 2500), "warning")).toHaveLength(1);
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
    expect(hits[0]!.damage).toBeGreaterThan(3);
    expect(match.fighters[1].health).toBeLessThan(RULES.maxHealth);
  });

  it("will not throw a second punch before the first lands", () => {
    const match = fighting();
    match.throwPunch(0, "right", "cross", 1);
    expect(match.throwPunch(0, "left", "jab", 1)).toBe(false);
  });

  it("blocks with a settled guard, chips a little, and opens a counter window", () => {
    const match = fighting();
    hold(match, 1, { guard: true });
    run(match, 100);
    match.throwPunch(0, "right", "cross", 1);
    const events = run(match, 200);
    expect(ofType(events, "block")).toHaveLength(1);
    expect(ofType(events, "counter")[0]).toMatchObject({ fighter: 1, from: "block" });
    expect(match.fighters[1].health).toBeGreaterThan(RULES.maxHealth - PUNCHES.cross.damage * 0.2);
    expect(match.fighters[1].counterOpen(match.now)).toBe(true);
  });

  it("makes a left jab counter land hard and stagger", () => {
    const match = fighting();
    hold(match, 1, { guard: true });
    run(match, 100);
    match.throwPunch(0, "right", "cross", 1);
    run(match, 200);
    hold(match, 1, {});
    match.throwPunch(1, "left", "jab", 0.5);
    const hit = ofType(run(match, 200), "hit")[0]!;
    expect(hit.counter).toBe(true);
    expect(hit.stagger).toBe(true);
    expect(hit.damage).toBeGreaterThan(PUNCHES.jab.damage * 2);
    expect(match.fighters[0].staggered(match.now)).toBe(true);
    // A staggered boxer can neither punch nor block.
    expect(match.throwPunch(0, "left", "jab", 1)).toBe(false);
  });

  it("gives no block to a boxer in the middle of a punch", () => {
    const match = fighting();
    hold(match, 1, { guard: true });
    run(match, 100);
    match.throwPunch(1, "left", "hook", 1, 400);
    match.throwPunch(0, "left", "jab", 1);
    expect(ofType(run(match, 150), "hit")[0]?.target).toBe(1);
  });

  it("lets a duck beat anything and a slip beat straights, but not hooks", () => {
    const match = fighting();
    hold(match, 1, { duck: true });
    match.throwPunch(0, "right", "hook", 1);
    expect(ofType(run(match, 400), "miss")[0]?.dodge).toBe("duck");
    hold(match, 1, { slip: 1 });
    match.throwPunch(0, "left", "jab", 1);
    expect(ofType(run(match, 400), "miss")[0]?.dodge).toBe("slip");
    match.throwPunch(0, "left", "hook", 1);
    expect(ofType(run(match, 400), "hit")).toHaveLength(1);
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
});
