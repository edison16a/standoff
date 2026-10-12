import { describe, expect, it } from "vitest";
import { BROADCAST_LOOK, easeLook, REPLAY_LOOK } from "./look";

describe("easing the look", () => {
  it("moves toward the replay's look over a few frames", () => {
    const look = { ...BROADCAST_LOOK };
    for (let i = 0; i < 300; i++) easeLook(look, REPLAY_LOOK, 1 / 60, 4);
    expect(look.dof).toBeCloseTo(REPLAY_LOOK.dof, 3);
  });

  // One NaN in the look would reach the grade every frame after it and draw the whole picture black.
  it("ignores a NaN step instead of turning the look NaN for good", () => {
    const look = { ...BROADCAST_LOOK };
    easeLook(look, REPLAY_LOOK, Number.NaN, 4);
    for (const value of Object.values(look)) expect(Number.isFinite(value)).toBe(true);
    expect(look).toEqual(BROADCAST_LOOK);
  });

  it("snaps on a cut", () => {
    const look = { ...BROADCAST_LOOK };
    easeLook(look, REPLAY_LOOK, 1e3, 4);
    expect(look.dof).toBeCloseTo(1, 6);
  });
});
