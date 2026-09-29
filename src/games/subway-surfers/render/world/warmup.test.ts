import { describe, expect, it } from "vitest";
import { POWER_KINDS } from "../../engine/types";
import { THEMES } from "./themes";
import { warmList } from "./warmup";

describe("the warm up list", () => {
  it("covers both sides of every zone in four variants, the trains, barriers, tunnels, signals and power ups", () => {
    const sides = THEMES.reduce((sum, theme) => sum + 1 + theme.sides.length * 2 * 4, 0);
    const trains = 4 * 2;
    const fixtures = 8;
    const signals = 3 * 2;
    expect(warmList()).toHaveLength(sides + trains + fixtures + POWER_KINDS.length + signals);
  });

  it("only describes the work, building nothing until each step runs", () => {
    // Building needs a canvas to paint on, which tests do not have: making the list must not touch one.
    expect(() => warmList()).not.toThrow();
  });
});
