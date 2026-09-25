import { describe, expect, it } from "vitest";
import { MOVEMENT } from "../engine/tuning";
import { dpadStick } from "./dpad-math";

describe("the direction pad", () => {
  it("rests in the middle", () => {
    expect(dpadStick(3, -4, 12)).toEqual({ x: 0, y: 0 });
  });

  it("reads the four directions, with up as positive y", () => {
    expect(dpadStick(40, 2, 12)).toEqual({ x: 1, y: 0 });
    expect(dpadStick(-40, -3, 12)).toEqual({ x: -1, y: 0 });
    expect(dpadStick(1, -40, 12)).toEqual({ x: 0, y: 1 });
    expect(dpadStick(-2, 40, 12)).toEqual({ x: 0, y: -1 });
  });

  it("gives diagonals that still jump and still move", () => {
    const upRight = dpadStick(30, -30, 12);
    expect(upRight.x).toBeGreaterThan(MOVEMENT.deadZone);
    expect(upRight.y).toBeGreaterThanOrEqual(MOVEMENT.flick);
  });
});
