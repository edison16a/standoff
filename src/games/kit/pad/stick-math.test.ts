import { describe, expect, it } from "vitest";
import { DEAD_ZONE, stickFromOffset, stickMoved } from "./stick-math";

describe("the virtual stick", () => {
  it("reads centred inside the dead zone", () => {
    expect(stickFromOffset(0, 0, 60)).toEqual({ x: 0, y: 0 });
    expect(stickFromOffset(60 * DEAD_ZONE * 0.9, 0, 60)).toEqual({ x: 0, y: 0 });
  });

  it("points up when the thumb moves up the screen", () => {
    const stick = stickFromOffset(0, -60, 60);
    expect(stick.x).toBeCloseTo(0, 6);
    expect(stick.y).toBeCloseTo(1, 6);
  });

  it("caps the throw at one and keeps the direction", () => {
    const stick = stickFromOffset(300, 300, 60);
    expect(Math.hypot(stick.x, stick.y)).toBeCloseTo(1, 6);
    expect(stick.x).toBeCloseTo(Math.SQRT1_2, 6);
    expect(stick.y).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it("starts small just past the dead zone, so slow walks are possible", () => {
    const stick = stickFromOffset(60 * (DEAD_ZONE + 0.05), 0, 60);
    expect(stick.x).toBeGreaterThan(0);
    expect(stick.x).toBeLessThan(0.1);
  });

  it("only reports real changes", () => {
    expect(stickMoved({ x: 0, y: 0 }, { x: 0.01, y: 0 })).toBe(false);
    expect(stickMoved({ x: 0, y: 0 }, { x: 0.1, y: 0 })).toBe(true);
  });
});
