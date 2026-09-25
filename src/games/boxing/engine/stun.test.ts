import { describe, expect, it } from "vitest";
import { CORNERS, FIGHT_RANGE } from "./footwork";
import type { Match } from "./match";
import { PUNCHES, RULES } from "./rules";
import { fighting, hold, ofType, run } from "./test-helpers";

/** Boxer 1 blocks a cross, then counters with a left jab to the head of boxer 0. */
function counterJab(match: Match): void {
  hold(match, 1, { shell: "guard" });
  match.throwPunch(0, "right", "cross", 1);
  run(match, 200);
  hold(match, 1, {});
  match.throwPunch(1, "left", "jab", 0.6);
}

describe("stuns", () => {
  it("stuns with a counter to the head: no punching, and a guard that barely works", () => {
    const match = fighting();
    counterJab(match);
    const hit = ofType(run(match, 200), "hit")[0]!;
    expect(hit.stagger).toBe(true);
    const stunned = match.fighters[0];
    expect(stunned.staggered(match.now)).toBe(true);
    expect(match.throwPunch(0, "left", "jab", 1)).toBe(false);
    hold(match, 0, { shell: "guard" });
    match.throwPunch(1, "right", "cross", 1);
    expect(ofType(run(match, 300), "hit")).toHaveLength(1);
  });

  it("stuns with a big head shot, but not with the same punch to the body", () => {
    const head = fighting();
    head.throwPunch(0, "right", "hook", 1);
    expect(ofType(run(head, 300), "hit")[0]!.stagger).toBe(true);
    const body = fighting();
    body.throwPunch(0, "right", "hook", 1, 0, "body");
    expect(ofType(run(body, 300), "hit")[0]!.stagger).toBe(false);
  });

  it("sends the stunned boxer back to their corner, with the other pressing them there", () => {
    const match = fighting();
    counterJab(match);
    run(match, 200);
    run(match, RULES.staggerMs);
    expect(match.footwork.pinned(match.now)).toBe(0);
    const [stunned, presser] = match.footwork.spots;
    const corner = CORNERS[0];
    expect(Math.hypot(stunned.x - corner.x, stunned.z - corner.z)).toBeLessThan(1);
    expect(match.footwork.distance()).toBeLessThan(FIGHT_RANGE + 0.15);
    expect(Math.hypot(presser.x, presser.z)).toBeLessThan(Math.hypot(stunned.x, stunned.z));
    run(match, RULES.trapMs + 100);
    expect(match.footwork.pinned(match.now)).toBeNull();
  });

  it("does not stun the same boxer again straight after", () => {
    const match = fighting();
    match.throwPunch(0, "right", "hook", 1);
    run(match, 300);
    run(match, RULES.staggerMs + RULES.trapMs);
    match.fighters[0].stamina = 100;
    match.throwPunch(0, "right", "hook", 1);
    expect(ofType(run(match, 300), "hit")[0]!.stagger).toBe(false);
  });
});

describe("fatigue", () => {
  it("leaves a boxer who took a string of hits slower and weaker for a while", () => {
    const fresh = fighting();
    fresh.throwPunch(1, "right", "cross", 0.5, 0, "body");
    const freshHit = ofType(run(fresh, 300), "hit")[0]!;

    const worn = fighting();
    for (let i = 0; i < 3; i++) {
      worn.fighters[0].stamina = 100;
      worn.throwPunch(0, "left", "jab", 0.5, 0, "body");
      run(worn, 400);
    }
    expect(worn.fighters[1].fatigue.level).toBeGreaterThan(0.3);
    worn.fighters[1].stamina = 100;
    worn.throwPunch(1, "right", "cross", 0.5, 0, "body");
    const punch = worn.fighters[1].punch!;
    expect(punch.impactAt - punch.start).toBeGreaterThan(PUNCHES.cross.travelMs * 1.1);
    const wornHit = ofType(run(worn, 400), "hit")[0]!;
    expect(wornHit.damage).toBeLessThan(freshHit.damage);

    // It wears off.
    run(worn, 8_000);
    expect(worn.fighters[1].fatigue.level).toBeLessThan(0.05);
  });

  it("keeps a boxer on low health a little worn", () => {
    const match = fighting();
    match.fighters[1].health = 20;
    run(match, 500);
    expect(match.fighters[1].fatigue.level).toBeGreaterThan(0.3);
  });
});
