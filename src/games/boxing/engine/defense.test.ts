import { describe, expect, it } from "vitest";
import { PUNCHES, RULES } from "./rules";
import { defenseOf } from "./stance";
import { fighting, hold, ofType, run } from "./test-helpers";
import { NO_DEFENSE, type DefenseInput } from "./types";

/** The defender's head somewhere, with nothing covering it. */
function headAt(x: number, y: number): DefenseInput {
  return { ...NO_DEFENSE, head: { x, y } };
}

describe("the head, judged where it is as the punch lands", () => {
  it("makes a head punch miss when the head moves out of its path before impact", () => {
    const match = fighting();
    // Wound up for a while, so the punch is well on its way when the head moves.
    match.throwPunch(0, "right", "cross", 1, 400);
    run(match, 420);
    match.setInput(1, headAt(0.26, 0));
    const events = run(match, 300);
    expect(ofType(events, "hit")).toHaveLength(0);
    expect(ofType(events, "miss")[0]).toMatchObject({ target: 1, dodge: "slip" });
  });

  it("lands on a head that moves too late, after the glove is already there", () => {
    const match = fighting();
    match.throwPunch(0, "right", "cross", 1);
    const before = run(match, PUNCHES.cross.travelMs + 20);
    match.setInput(1, headAt(0.26, 0));
    const events = [...before, ...run(match, 200)];
    expect(ofType(events, "hit")).toHaveLength(1);
    expect(ofType(events, "miss")).toHaveLength(0);
  });

  it("follows a head that drifts during the wind up, so moving early does not help", () => {
    const match = fighting();
    match.throwPunch(0, "left", "jab", 1, 900);
    run(match, 50);
    match.setInput(1, headAt(0.26, 0));
    const events = run(match, 1100);
    expect(ofType(events, "hit")).toHaveLength(1);
  });

  it("lets a duck beat a hook, but not a slip", () => {
    const ducked = fighting();
    ducked.throwPunch(0, "left", "hook", 1, 300);
    run(ducked, 320);
    hold(ducked, 1, { duck: 1 });
    expect(ofType(run(ducked, 300), "miss")[0]?.dodge).toBe("duck");

    const slipped = fighting();
    slipped.throwPunch(0, "left", "hook", 1, 300);
    run(slipped, 320);
    slipped.setInput(1, headAt(0.26, 0));
    expect(ofType(run(slipped, 300), "hit")).toHaveLength(1);
  });

  it("turns a head that only half gets out of the way into a glancing blow", () => {
    const clean = fighting();
    clean.throwPunch(0, "right", "cross", 0.5);
    const full = ofType(run(clean, 300), "hit")[0]!.damage;
    const glance = fighting();
    glance.throwPunch(0, "right", "cross", 0.5, 300);
    run(glance, 320);
    glance.setInput(1, headAt(0.15, 0));
    const partial = ofType(run(glance, 300), "hit")[0]!.damage;
    expect(partial).toBeLessThan(full * 0.9);
    expect(partial).toBeGreaterThan(full * 0.3);
  });

  it("never lets moving the head escape a body shot", () => {
    const match = fighting();
    match.throwPunch(0, "left", "hook", 1, 300, "body");
    run(match, 320);
    hold(match, 1, { duck: 1 });
    expect(ofType(run(match, 300), "hit")).toHaveLength(1);
  });
});

describe("blocks by where the gloves are", () => {
  it("stops a jab or a cross to the head with both gloves in front of the face", () => {
    const match = fighting();
    hold(match, 1, { shell: "guard" });
    match.throwPunch(0, "left", "jab", 1);
    expect(ofType(run(match, 300), "block")).toHaveLength(1);
  });

  it("stops a hook only with the glove up on the side it lands", () => {
    // A left hook lands on the defender's right side.
    const right = fighting();
    hold(right, 1, { shell: "high", side: "right" });
    right.throwPunch(0, "left", "hook", 1);
    expect(ofType(run(right, 300), "block")).toHaveLength(1);

    const wrong = fighting();
    hold(wrong, 1, { shell: "high", side: "left" });
    wrong.throwPunch(0, "left", "hook", 1);
    const hit = ofType(run(wrong, 300), "hit")[0]!;
    expect(hit.cover).toBeGreaterThan(0.3);
    expect(hit.cover).toBeLessThan(RULES.blockAt);
  });

  it("needs the elbows down for a body shot, which a high guard only half covers", () => {
    const elbows = fighting();
    hold(elbows, 1, { shell: "body" });
    elbows.throwPunch(0, "right", "cross", 1, 0, "body");
    expect(ofType(run(elbows, 300), "block")).toHaveLength(1);

    const high = fighting();
    hold(high, 1, { shell: "guard" });
    high.throwPunch(0, "right", "cross", 1, 0, "body");
    const hit = ofType(run(high, 300), "hit")[0]!;
    expect(hit.cover).toBeGreaterThan(0.3);
  });

  it("takes some of the damage off with partial cover", () => {
    const open = fighting();
    open.throwPunch(0, "right", "cross", 0.5, 0, "body");
    const full = ofType(run(open, 300), "hit")[0]!.damage;
    const half = fighting();
    half.setInput(1, { ...NO_DEFENSE, cover: { left: { face: 0, side: 0, body: 0.5 }, right: { face: 0, side: 0, body: 0.5 } } });
    half.throwPunch(0, "right", "cross", 0.5, 0, "body");
    const partial = ofType(run(half, 300), "hit")[0]!.damage;
    expect(partial).toBeCloseTo(full * 0.5, 0);
  });

  it("gives no block to a boxer in the middle of a punch", () => {
    const match = fighting();
    match.setInput(1, defenseOf({ shell: "guard" }));
    match.throwPunch(1, "left", "hook", 1, 400);
    match.throwPunch(0, "left", "jab", 1);
    expect(ofType(run(match, 150), "hit")[0]?.target).toBe(1);
  });
});
