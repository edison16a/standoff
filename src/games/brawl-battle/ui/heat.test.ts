import { describe, expect, it } from "vitest";
import { heatColour, shakeAmount } from "./heat";

describe("the percent's heat", () => {
  it("runs from white to deep red", () => {
    expect(heatColour(0)).toBe("rgb(255, 255, 255)");
    expect(heatColour(120)).toBe("rgb(244, 63, 54)");
    expect(heatColour(400)).toBe("rgb(160, 16, 30)");
  });

  it("shakes more as damage rises, never past full", () => {
    expect(shakeAmount(0)).toBe(0);
    expect(shakeAmount(90)).toBeGreaterThan(shakeAmount(60));
    expect(shakeAmount(300)).toBe(1);
  });
});
