import { describe, expect, it } from "vitest";
import { DUCK_DROP, SLIP_SIDE } from "../engine/stance";
import { keyboard } from "../keyboard";
import { applyKey } from "./key-controls";
import { BoxingKeys } from "./key-input";
import { PickControl } from "./pick-control";
import type { FightDriver } from "./fight-driver";

describe("Boxing keyboard mode", () => {
  it("throws a jab, a cross and both hooks on their keys", () => {
    const keys = new BoxingKeys();
    expect(keys.press("KeyJ", true)).toEqual({ type: "punch", hand: "left", straight: true, level: "head" });
    expect(keys.press("KeyK", true)).toEqual({ type: "punch", hand: "right", straight: true, level: "head" });
    expect(keys.press("KeyU", true)).toEqual({ type: "punch", hand: "left", straight: false, level: "head" });
    expect(keys.press("KeyI", true)).toEqual({ type: "punch", hand: "right", straight: false, level: "head" });
  });

  it("throws once per press, never on the key up or a repeat", () => {
    const keys = new BoxingKeys();
    expect(keys.press("KeyJ", true, true)).toBeNull();
    expect(keys.press("KeyJ", false)).toBeNull();
  });

  it("digs to the body when punching while ducking", () => {
    const keys = new BoxingKeys();
    keys.press("KeyS", true);
    expect(keys.press("KeyK", true)).toMatchObject({ level: "body" });
    keys.press("KeyS", false);
    expect(keys.press("KeyK", true)).toMatchObject({ level: "head" });
  });

  it("moves the head to slip and duck while the keys are held", () => {
    const keys = new BoxingKeys();
    keys.press("KeyA", true);
    keys.press("ArrowDown", true);
    expect(keys.defense().head).toEqual({ x: -SLIP_SIDE, y: -DUCK_DROP });
    keys.press("KeyD", true);
    expect(keys.defense().head.x).toBe(0);
    keys.release();
    expect(keys.defense().head).toEqual({ x: 0, y: -0 });
  });

  it("covers the face, an ear or the ribs with the block keys", () => {
    const keys = new BoxingKeys();
    expect(keys.defense().guard).toBe(false);
    keys.press("Space", true);
    expect(keys.defense()).toMatchObject({ guard: true, raise: true, cover: { left: { face: 1 }, right: { face: 1 } } });
    keys.press("KeyE", true);
    expect(keys.defense().cover.right.side).toBe(1);
    expect(keys.defense().cover.left.side).toBeLessThan(1);
    keys.press("KeyE", false);
    keys.press("Space", false);
    keys.press("ShiftLeft", true);
    expect(keys.defense()).toMatchObject({ guard: false, raise: false, cover: { left: { body: 1 }, right: { body: 1 } } });
  });

  it("reaches both gloves out to touch while F is held", () => {
    const keys = new BoxingKeys();
    keys.press("KeyF", true);
    expect(keys.defense().reach).toBe(true);
    keys.press("KeyF", false);
    expect(keys.defense().reach).toBe(false);
  });

  it("browses and locks in a build on the build screen, and punches only in the fight", () => {
    const pick = new PickControl([0, 1], [true, false]);
    const keys = new BoxingKeys();
    expect(applyKey(keys.press("KeyD", true)!, "pick", null, pick)).toBe(true);
    expect(pick.state.picks[0]).not.toBe(0);
    expect(applyKey(keys.press("KeyJ", true)!, "pick", null, pick)).toBe(false);
    expect(applyKey(keys.press("Space", true)!, "pick", null, pick)).toBe(true);
    expect(pick.done).toBe(true);

    const punches: unknown[] = [];
    const driver = { punch: (...args: unknown[]) => punches.push(args) } as unknown as FightDriver;
    applyKey(keys.press("KeyI", true)!, "fight", driver, null);
    expect(punches).toEqual([[1, "right", false, 0.7, "head"]]);
    applyKey(keys.press("KeyJ", true)!, "results", driver, null);
    expect(punches).toHaveLength(1);
  });

  it("only lists keys on the keyboard player's card, leaving them to the game", () => {
    const player = keyboard.create({ seat: 1, send: () => undefined, sendLossy: () => undefined, last: () => null });
    expect(player.key).toBeUndefined();
  });
});
