import { describe, expect, it } from "vitest";
import { drop, IDLE, lift, litSlot, press, slide, slotAt, type Box } from "./throw-gesture";

/** Two by two buttons, 100 pixels square with an 8 pixel gap, as the phone lays them out. */
const BOXES: Box[] = [
  { left: 0, top: 0, right: 100, bottom: 100 },
  { left: 108, top: 0, right: 208, bottom: 100 },
  { left: 0, top: 108, right: 100, bottom: 208 },
  { left: 108, top: 108, right: 208, bottom: 208 },
];
const ALL = [true, true, true, true];

describe("finding the button under a finger", () => {
  it("names the button it is on, the nearest across a gap, and none well off them", () => {
    expect(slotAt(BOXES, 50, 50)).toBe(0);
    expect(slotAt(BOXES, 150, 150)).toBe(3);
    expect(slotAt(BOXES, 103, 50)).toBe(0);
    expect(slotAt(BOXES, 106, 50)).toBe(1);
    expect(slotAt(BOXES, 300, 50)).toBeNull();
    expect(slotAt(BOXES, 50, -40)).toBeNull();
  });
});

describe("press, slide and release on the throw buttons", () => {
  it("lights the button a finger lands on, and throws nothing yet", () => {
    const g = press(IDLE, 1, 2);
    expect(g).toEqual({ pointer: 1, slot: 2 });
    expect(litSlot(g, ALL)).toBe(2);
  });

  it("moves the light as the finger slides across the buttons", () => {
    let g = press(IDLE, 1, 0);
    g = slide(g, 1, 1);
    expect(litSlot(g, ALL)).toBe(1);
    g = slide(g, 1, 3);
    expect(litSlot(g, ALL)).toBe(3);
  });

  it("throws to the button it lets go over", () => {
    const g = slide(press(IDLE, 1, 0), 1, 3);
    expect(lift(g, 1, 3, ALL)).toEqual({ next: IDLE, throwAt: 3 });
  });

  it("throws nothing and clears the light when let go off every button", () => {
    const g = slide(press(IDLE, 1, 0), 1, null);
    expect(litSlot(g, ALL)).toBeNull();
    expect(lift(g, 1, null, ALL)).toEqual({ next: IDLE, throwAt: null });
  });

  it("still throws at once on a quick tap", () => {
    expect(lift(press(IDLE, 7, 1), 7, 1, ALL)).toEqual({ next: IDLE, throwAt: 1 });
  });

  it("neither lights nor throws a greyed button", () => {
    const open = [true, false, true, true];
    const g = press(IDLE, 1, 1);
    expect(litSlot(g, open)).toBeNull();
    expect(lift(g, 1, 1, open).throwAt).toBeNull();
  });

  it("starts only on a button, and follows one finger: a second is ignored", () => {
    expect(press(IDLE, 1, null)).toBe(IDLE);
    const g = press(IDLE, 1, 0);
    expect(press(g, 2, 3)).toBe(g);
    expect(slide(g, 2, 3)).toBe(g);
    expect(lift(g, 2, 3, ALL)).toEqual({ next: g, throwAt: null });
  });

  it("throws nothing when the browser takes the finger away", () => {
    expect(drop(press(IDLE, 1, 2), 1)).toBe(IDLE);
    const g = press(IDLE, 1, 2);
    expect(drop(g, 9)).toBe(g);
  });
});
