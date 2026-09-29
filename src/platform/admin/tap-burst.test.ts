import { describe, expect, it } from "vitest";
import { TAP_GAP_MS, TapBurst } from "./tap-burst";

describe("tap burst", () => {
  it("fires on the third quick tap", () => {
    const burst = new TapBurst();
    expect(burst.tap(0)).toBe(false);
    expect(burst.tap(200)).toBe(false);
    expect(burst.tap(400)).toBe(true);
  });

  it("starts over after a slow tap", () => {
    const burst = new TapBurst();
    burst.tap(0);
    burst.tap(200);
    expect(burst.tap(200 + TAP_GAP_MS + 1)).toBe(false);
    expect(burst.tap(300 + TAP_GAP_MS)).toBe(false);
    expect(burst.tap(400 + TAP_GAP_MS)).toBe(true);
  });

  it("counts a fourth quick tap as a new burst", () => {
    const burst = new TapBurst();
    [0, 100, 200].forEach((t) => burst.tap(t));
    expect(burst.tap(300)).toBe(false);
    expect(burst.tap(400)).toBe(false);
    expect(burst.tap(500)).toBe(true);
  });
});
