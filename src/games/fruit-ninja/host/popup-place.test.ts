import { describe, expect, it } from "vitest";
import { placeCallout, type LiveCallout } from "./popup-place";

const box = (left: number, top: number, until = 1000): LiveCallout => ({ left, top, width: 200, height: 60, rise: 0, until });

describe("placeCallout", () => {
  it("keeps the spot it wants when nothing is there", () => {
    expect(placeCallout([box(100, 400)], { left: 600, top: 400, width: 200, height: 60 }, 0, 60, 680).top).toBe(400);
  });

  it("stacks a second callout above one it would cover", () => {
    const placed = placeCallout([box(300, 400)], { left: 320, top: 410, width: 200, height: 60 }, 0, 60, 680);
    expect(placed.left).toBe(320);
    expect(placed.top).toBeLessThanOrEqual(400 - 60 - 6);
  });

  it("climbs a whole stack", () => {
    const live = [box(300, 400), box(300, 334)];
    const placed = placeCallout(live, { left: 300, top: 400, width: 200, height: 60 }, 0, 60, 680);
    expect(placed.top).toBeLessThanOrEqual(334 - 66);
  });

  it("goes below when there is no room above", () => {
    const placed = placeCallout([box(300, 80)], { left: 300, top: 80, width: 200, height: 60 }, 0, 60, 680);
    expect(placed.top).toBeGreaterThanOrEqual(80 + 66);
  });

  it("clears a stack below and above in one pass, with uneven sizes", () => {
    const live = [
      { left: 632.9, top: 140.5, width: 134, height: 82, rise: 0, until: 2452 },
      { left: 277.3, top: 205.9, width: 141, height: 82, rise: 0, until: 2452 },
      { left: 587.4, top: 228.5, width: 116, height: 82, rise: 0, until: 3140 },
    ];
    const placed = placeCallout(live, { left: 495.5, top: 275.2, width: 349, height: 82 }, 2160, 60, 500);
    expect(placed.top).toBeGreaterThanOrEqual(228.5 + 88);
  });

  it("keeps clear of the path a callout climbs, not just where it started", () => {
    const rising: LiveCallout = { left: 300, top: 400, width: 200, height: 60, rise: 90, until: 1000 };
    // Just above where it began, but right where it will be in a moment.
    const placed = placeCallout([rising], { left: 300, top: 330, width: 200, height: 60 }, 0, 60, 680);
    expect(placed.top <= 400 - 90 - 60 - 6 || placed.top >= 400 + 60 + 6).toBe(true);
  });

  it("ignores callouts that have already gone", () => {
    const placed = placeCallout([box(300, 400, 500)], { left: 300, top: 400, width: 200, height: 60 }, 600, 60, 680);
    expect(placed.top).toBe(400);
  });
});
