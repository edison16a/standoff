import { describe, expect, it } from "vitest";
import { PadTracker } from "./pad-tracker";

describe("PadTracker", () => {
  it("moves by how far the finger went", () => {
    const pad = new PadTracker();
    pad.press(1, 10, 10);
    expect(pad.move(1, 30, 5)).toEqual({ dx: 20, dy: -5 });
    expect(pad.move(1, 35, 5)).toEqual({ dx: 5, dy: 0 });
  });

  it("lets the newest finger drive and ignores the other", () => {
    const pad = new PadTracker();
    pad.press(1, 0, 0);
    pad.press(2, 100, 100);
    expect(pad.move(1, 10, 0)).toBeNull();
    expect(pad.move(2, 110, 100)).toEqual({ dx: 10, dy: 0 });
  });

  it("hands back to the finger still down when the newest lifts, from where it is now", () => {
    const pad = new PadTracker();
    pad.press(1, 0, 0);
    pad.press(2, 100, 100);
    pad.move(1, 40, 0);
    pad.lift(2);
    expect(pad.move(1, 50, 0)).toEqual({ dx: 10, dy: 0 });
  });

  it("keeps the driving finger when an older one lifts", () => {
    const pad = new PadTracker();
    pad.press(1, 0, 0);
    pad.press(2, 100, 100);
    pad.lift(1);
    expect(pad.move(2, 120, 100)).toEqual({ dx: 20, dy: 0 });
  });

  it("ignores fingers it never saw go down", () => {
    expect(new PadTracker().move(7, 1, 1)).toBeNull();
  });
});
