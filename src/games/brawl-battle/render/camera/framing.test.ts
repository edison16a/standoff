import { describe, expect, it } from "vitest";
import { STAGES } from "../../engine/stages";
import { fit, frameBox } from "./framing";

const stage = STAGES["dojo-rooftop"];

describe("frameBox", () => {
  it("keeps a lone fighter in a wide enough shot", () => {
    const box = frameBox([{ x: 0, y: 0 }], stage);
    expect(box.x2 - box.x1).toBeGreaterThanOrEqual(17 - 1e-9);
  });

  it("grows to hold fighters far apart and stays inside the blast zone", () => {
    const box = frameBox([{ x: -18, y: 0 }, { x: 18, y: 12 }], stage);
    expect(box.x1).toBeGreaterThanOrEqual(stage.blast.left);
    expect(box.x2).toBeLessThanOrEqual(stage.blast.right);
    expect(box.y2).toBeLessThanOrEqual(stage.blast.top);
  });

  it("always keeps the main platform's top in the shot", () => {
    const box = frameBox([{ x: 0, y: 6 }], stage);
    expect(box.y1).toBeLessThan(0);
  });
});

describe("fit", () => {
  it("stands further back for a wider box and for a narrower screen", () => {
    const small = fit({ x1: -5, x2: 5, y1: -2, y2: 4 }, 30, 16 / 9);
    const wide = fit({ x1: -10, x2: 10, y1: -2, y2: 4 }, 30, 16 / 9);
    const narrow = fit({ x1: -10, x2: 10, y1: -2, y2: 4 }, 30, 4 / 3);
    expect(wide.distance).toBeGreaterThan(small.distance);
    expect(narrow.distance).toBeGreaterThan(wide.distance);
    expect(wide.x).toBe(0);
    expect(wide.y).toBe(1);
  });
});

describe("fit above the HUD", () => {
  const box = { x1: -10, x2: 10, y1: -2, y2: 6 };
  const tan = Math.tan((30 * Math.PI) / 360);

  it("keeps the box inside the part of the screen the cards leave open", () => {
    for (const aspect of [16 / 9, 4 / 3, 21 / 9]) {
      const hidden = 0.18;
      const f = fit(box, 30, aspect, hidden);
      const half = f.distance * tan;
      // The screen spans y - half to y + half; the cards cover its lowest `hidden` share.
      expect(f.y + half).toBeGreaterThanOrEqual(box.y2 - 1e-9);
      expect(f.y - half + 2 * half * hidden).toBeLessThanOrEqual(box.y1 + 1e-9);
      expect((half * aspect)).toBeGreaterThanOrEqual(10 - 1e-9);
    }
  });

  it("matches the plain fit with nothing covered", () => {
    expect(fit(box, 30, 16 / 9, 0)).toEqual(fit(box, 30, 16 / 9));
  });
});
