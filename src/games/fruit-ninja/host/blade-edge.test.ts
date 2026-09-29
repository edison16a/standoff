import { describe, expect, it } from "vitest";
import { HALF_HEIGHT } from "../engine/tuning";
import { bladeAt } from "./round-driver";

describe("the blade at the screen's edge", () => {
  it("maps the aim straight onto the screen inside the edges", () => {
    expect(bladeAt({ x: 0.5, y: -0.5 }, 8)).toEqual({ x: 4, y: -HALF_HEIGHT / 2 });
  });

  it("stops the tip just inside the edge, so it stays in sight", () => {
    const at = bladeAt({ x: 1, y: -1 }, 8);
    expect(at.x).toBeLessThan(8);
    expect(at.x).toBeGreaterThan(7.5);
    expect(at.y).toBeGreaterThan(-HALF_HEIGHT);
  });

  it("moves again as soon as the aim comes back in", () => {
    expect(bladeAt({ x: 0.9, y: 0 }, 8).x).toBeLessThan(bladeAt({ x: 1, y: 0 }, 8).x);
  });
});
