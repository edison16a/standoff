import { describe, expect, it } from "vitest";
import { KeyInput, KEYS } from "./key-input";

describe("keyboard mode", () => {
  it("reads the arrow keys and WASD alike", () => {
    expect([KEYS.ArrowLeft, KEYS.ArrowRight, KEYS.ArrowUp, KEYS.ArrowDown]).toEqual(["left", "right", "jump", "duck"]);
    expect([KEYS.KeyA, KEYS.KeyD, KEYS.KeyW, KEYS.KeyS]).toEqual(["left", "right", "jump", "duck"]);
  });

  it("moves one track a press, and no further than the edge", () => {
    const keys = new KeyInput();
    keys.press("left", true);
    expect(keys.take().lane).toBe(-1);
    keys.press("left", false);
    keys.press("left", true);
    expect(keys.take().lane).toBe(-1);
    keys.press("right", true);
    keys.press("right", true);
    expect(keys.take().lane).toBe(1);
  });

  it("ignores a key held down repeating", () => {
    const keys = new KeyInput();
    keys.press("right", true);
    keys.press("right", true, true);
    expect(keys.take().lane).toBe(1);
    keys.press("jump", true);
    keys.take();
    expect(keys.press("jump", true, true)).toBeNull();
    expect(keys.take().jump).toBe(false);
  });

  it("hands a jump out once", () => {
    const keys = new KeyInput();
    expect(keys.press("jump", true)).toBe("jump");
    expect(keys.take().jump).toBe(true);
    expect(keys.take().jump).toBe(false);
  });

  it("rolls on down and keeps rolling while it is held", () => {
    const keys = new KeyInput();
    expect(keys.press("duck", true)).toBe("duck");
    expect(keys.take()).toMatchObject({ duck: true, ducking: true });
    expect(keys.take()).toMatchObject({ duck: false, ducking: true });
    keys.press("duck", false);
    expect(keys.take().ducking).toBe(false);
  });

  it("lets go of a held roll when the window loses focus", () => {
    const keys = new KeyInput();
    keys.press("duck", true);
    keys.release();
    expect(keys.take().ducking).toBe(false);
  });

  it("starts a new run in the middle with nothing pending", () => {
    const keys = new KeyInput();
    keys.press("left", true);
    keys.press("jump", true);
    keys.reset();
    expect(keys.take()).toMatchObject({ lane: 0, jump: false, duck: false });
  });
});
