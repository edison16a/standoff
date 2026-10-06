import { describe, expect, it } from "vitest";
import { DUCK_DROP, SLIP_SIDE } from "../engine/stance";
import { fighting, ofType, run } from "../engine/test-helpers";
import { KEYS, KeyBoxer } from "./key-boxer";

describe("keyboard mode keys", () => {
  it("maps WASD, the arrows and the punch keys by where they sit", () => {
    expect([KEYS.KeyA, KEYS.ArrowLeft, KEYS.KeyD, KEYS.ArrowRight, KEYS.KeyS, KEYS.ArrowDown]).toEqual([
      "slip-left",
      "slip-left",
      "slip-right",
      "slip-right",
      "duck",
      "duck",
    ]);
    expect([KEYS.KeyJ, KEYS.KeyK, KEYS.KeyU, KEYS.KeyI]).toEqual(["jab", "cross", "hook-left", "hook-right"]);
    expect([KEYS.Space, KEYS.ShiftLeft, KEYS.ShiftRight, KEYS.KeyF, KEYS.KeyE]).toEqual(["guard", "high", "high", "body", "touch"]);
  });
});

describe("KeyBoxer", () => {
  it("throws the four punches on key down only", () => {
    const boxer = new KeyBoxer();
    expect(boxer.press("jab", true)).toEqual({ hand: "left", straight: true, level: "head" });
    expect(boxer.press("jab", false)).toBeNull();
    expect(boxer.press("cross", true)).toEqual({ hand: "right", straight: true, level: "head" });
    expect(boxer.press("hook-left", true)).toEqual({ hand: "left", straight: false, level: "head" });
    expect(boxer.press("hook-right", true)).toEqual({ hand: "right", straight: false, level: "head" });
    expect(boxer.press("guard", true)).toBeNull();
  });

  it("digs to the body when punching while ducked, as dipping does on camera", () => {
    const boxer = new KeyBoxer();
    boxer.press("duck", true);
    expect(boxer.press("cross", true)?.level).toBe("body");
    boxer.press("duck", false);
    expect(boxer.press("cross", true)?.level).toBe("head");
  });

  it("eases the head to a full slip or duck and back", () => {
    const boxer = new KeyBoxer();
    boxer.defense(0);
    boxer.press("slip-left", true);
    expect(boxer.defense(30).head.x).toBeLessThan(0);
    expect(boxer.defense(500).head.x).toBeCloseTo(-SLIP_SIDE, 2);
    boxer.press("slip-left", false);
    boxer.press("duck", true);
    const ducked = boxer.defense(1000).head;
    expect(ducked.x).toBeCloseTo(0, 2);
    expect(ducked.y).toBeCloseTo(-DUCK_DROP, 2);
  });

  it("cancels opposite slips", () => {
    const boxer = new KeyBoxer();
    boxer.press("slip-left", true);
    boxer.press("slip-right", true);
    boxer.defense(0);
    expect(boxer.defense(500).head.x).toBeCloseTo(0);
  });

  it("covers up: the guard for the face, Shift for both sides, F for the body", () => {
    const boxer = new KeyBoxer();
    expect(boxer.defense(0).guard).toBe(false);
    boxer.press("guard", true);
    const guard = boxer.defense(16);
    expect(guard.guard && guard.raise).toBe(true);
    expect(guard.cover.left.face).toBe(1);
    boxer.press("high", true);
    const high = boxer.defense(32);
    expect([high.cover.left.side, high.cover.right.side]).toEqual([1, 1]);
    boxer.press("high", false);
    boxer.press("guard", false);
    boxer.press("body", true);
    const body = boxer.defense(48);
    expect([body.cover.left.body, body.cover.right.body]).toEqual([1, 1]);
    expect(body.raise).toBe(false);
  });

  it("holds both gloves out to touch with E, and lets go of everything on release", () => {
    const boxer = new KeyBoxer();
    boxer.press("touch", true);
    expect(boxer.defense(0).reach).toBe(true);
    boxer.press("guard", true);
    boxer.release();
    const loose = boxer.defense(16);
    expect(loose.reach || loose.guard).toBe(false);
  });

  it("plays by the fight's own rules: a held guard blocks a jab and a duck slips under a hook", () => {
    const guarded = fighting();
    const boxer = new KeyBoxer();
    boxer.press("guard", true);
    guarded.setInput(1, boxer.defense(0));
    guarded.throwPunch(0, "left", "jab", 1);
    expect(ofType(run(guarded, 400), "block")).toHaveLength(1);

    const ducked = fighting();
    const ducker = new KeyBoxer();
    ducked.throwPunch(0, "left", "hook", 1, 300);
    run(ducked, 320);
    ducker.press("duck", true);
    ducker.defense(0);
    ducked.setInput(1, ducker.defense(250));
    expect(ofType(run(ducked, 300), "miss")[0]?.dodge).toBe("duck");
  });
});
