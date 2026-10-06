import { describe, expect, it } from "vitest";
import { AI_LEVELS, ComputerBoxer } from "./ai";
import { coverOf } from "./cover";
import { seeded } from "./random";
import { PUNCHES } from "./rules";
import { defenseOf } from "./stance";
import { fighting, hold, ofType, run } from "./test-helpers";

/** An uppercut from the red corner, wound up long enough that the defence is set before it leaves. */
function uppercut(posture: Parameters<typeof hold>[2]) {
  const match = fighting();
  match.throwPunch(0, "right", "uppercut", 1, 300);
  run(match, 320);
  hold(match, 1, posture);
  return run(match, 400);
}

describe("the uppercut", () => {
  it("is the heaviest punch, and the slowest back to the guard", () => {
    for (const style of ["jab", "cross", "hook"] as const) {
      expect(PUNCHES.uppercut.damage).toBeGreaterThan(PUNCHES[style].damage);
      expect(PUNCHES.uppercut.recoverMs).toBeGreaterThan(PUNCHES[style].recoverMs);
    }
  });

  it("comes up from below, so a duck walks into it", () => {
    expect(ofType(uppercut({ duck: 1 }), "hit")).toHaveLength(1);
  });

  it("misses a boxer who slips it", () => {
    const events = uppercut({ slip: 1 });
    expect(ofType(events, "hit")).toHaveLength(0);
    expect(ofType(events, "miss")[0]?.dodge).toBe("slip");
  });

  it("splits a high shell, but a tight guard takes most of it", () => {
    const match = fighting();
    match.throwPunch(0, "right", "uppercut", 1);
    const punch = match.fighters[0].punch!;
    const defender = match.fighters[1];
    defender.setInput(defenseOf({ shell: "guard" }));
    const guard = coverOf(punch, defender, match.now);
    defender.setInput(defenseOf({ shell: "high", side: "left" }));
    const high = coverOf(punch, defender, match.now);
    expect(guard).toBeGreaterThanOrEqual(0.75);
    expect(high).toBeLessThan(guard);
  });
});

describe("the computer boxer against an uppercut", () => {
  it("slips it, since ducking walks into it", () => {
    const always = { ...AI_LEVELS[0]!, dodge: 1, block: 0 };
    for (let seed = 1; seed <= 6; seed++) {
      const match = fighting();
      const boxer = new ComputerBoxer(1, seeded(seed), () => always);
      match.throwPunch(0, "left", "uppercut", 1, 300);
      for (const event of run(match, 20)) boxer.hear(event, match);
      const head = match.fighters[1].input.head;
      expect(head.y).toBeCloseTo(0);
      expect(Math.abs(head.x)).toBeGreaterThan(0.2);
    }
  });
});
