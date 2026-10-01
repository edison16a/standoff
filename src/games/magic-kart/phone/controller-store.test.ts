import { describe, expect, it } from "vitest";
import { steersWithArrows } from "./controller-store";

describe("the steering on the pad", () => {
  it("is the wheel once tilt readings arrive", () => {
    expect(steersWithArrows({ steerMode: "tilt", sensorsLive: true })).toBe(false);
  });

  it("is the arrows when the player chose buttons", () => {
    expect(steersWithArrows({ steerMode: "buttons", sensorsLive: true })).toBe(true);
  });

  it("is the arrows for a phone that rejoined with no tilt readings", () => {
    expect(steersWithArrows({ steerMode: "tilt", sensorsLive: false })).toBe(true);
  });
});
