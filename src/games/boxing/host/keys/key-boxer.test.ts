import { describe, expect, it } from "vitest";
import { fighting, ofType, run } from "../../engine/test-helpers";
import { DUCK_DROP, SLIP_SIDE } from "../../engine/stance";
import { FightDriver } from "../fight-driver";
import { BOB_MS, BOX_KEYS, KEY_PUNCHES, KeyBoxer } from "./key-boxer";

/** Presses a key by its code, as keyboard mode does. */
function key(boxer: KeyBoxer, code: string, down: boolean, now = 0) {
  return boxer.press(BOX_KEYS[code]!, down, now);
}

describe("keyboard boxing", () => {
  it("throws each punch from its own key", () => {
    const boxer = new KeyBoxer();
    expect(key(boxer, "KeyJ", true)).toEqual({ hand: "left", straight: true, level: "head", power: 0.7 });
    expect(key(boxer, "KeyK", true)).toMatchObject({ hand: "right", straight: true, level: "head" });
    expect(key(boxer, "KeyL", true)).toMatchObject({ hand: "left", straight: false, level: "head" });
    // No uppercut in the match: the rear hand dug up into the body.
    expect(key(boxer, "KeyI", true)).toEqual(KEY_PUNCHES.uppercut);
    expect(KEY_PUNCHES.uppercut).toMatchObject({ hand: "right", level: "body" });
    expect(key(boxer, "KeyJ", false)).toBeNull();
  });

  it("blocks while Shift is held, and covers the body on F", () => {
    const boxer = new KeyBoxer();
    expect(boxer.defense(0).guard).toBe(false);
    key(boxer, "ShiftLeft", true);
    const up = boxer.defense(10);
    expect(up.guard).toBe(true);
    expect(up.raise).toBe(true);
    expect(up.cover.left.face).toBe(1);
    key(boxer, "ShiftLeft", false);
    key(boxer, "KeyF", true);
    const low = boxer.defense(20);
    expect(low.guard).toBe(false);
    expect(low.cover.right.body).toBe(1);
  });

  it("eases the head into a duck and a slip, never in one jump", () => {
    const boxer = new KeyBoxer();
    boxer.defense(0);
    key(boxer, "ArrowDown", true);
    key(boxer, "KeyA", true);
    const early = boxer.defense(16);
    expect(early.head.y).toBeLessThan(0);
    expect(early.head.y).toBeGreaterThan(-DUCK_DROP);
    let late = early;
    for (let t = 32; t <= 400; t += 16) late = boxer.defense(t);
    expect(late.head.y).toBeCloseTo(-DUCK_DROP, 2);
    expect(late.head.x).toBeCloseTo(-SLIP_SIDE, 2);
  });

  it("bobs under on Space and comes back up by itself", () => {
    const boxer = new KeyBoxer();
    boxer.defense(0);
    key(boxer, "Space", true, 0);
    key(boxer, "Space", false, 30);
    let head = 0;
    for (let t = 16; t < BOB_MS; t += 16) head = boxer.defense(t).head.y;
    expect(head).toBeLessThan(-DUCK_DROP * 0.9);
    for (let t = BOB_MS; t < BOB_MS + 400; t += 16) head = boxer.defense(t).head.y;
    expect(head).toBeGreaterThan(-0.01);
  });

  it("holds the gloves out on E to touch, and lets go of everything on release", () => {
    const boxer = new KeyBoxer();
    key(boxer, "KeyE", true);
    key(boxer, "ShiftRight", true);
    expect(boxer.defense(0).reach).toBe(true);
    boxer.release();
    const free = boxer.defense(16);
    expect(free.reach).toBe(false);
    expect(free.guard).toBe(false);
  });

  it("a held keyboard guard stops the computer's jab in a real match", () => {
    const match = fighting();
    const boxer = new KeyBoxer();
    key(boxer, "ShiftLeft", true);
    match.setInput(0, boxer.defense(match.now));
    match.throwPunch(1, "left", "jab", 0.8);
    const events = run(match, 600);
    expect(ofType(events, "block").map((block) => block.target)).toEqual([0]);
  });

  it("a keyboard punch counts once the fight is live", () => {
    const driver = new FightDriver({ seed: 3, slots: [1, null], introMs: 100, touch: false });
    for (let t = 0; t <= 1500; t += 100) driver.tick(t);
    const jab = KEY_PUNCHES.jab;
    expect(driver.punch(1, jab.hand, jab.straight, jab.power, jab.level)).toBe(true);
  });
});
