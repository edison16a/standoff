import { describe, expect, it } from "vitest";
import { balance, BROADCAST_LOOK, CEREMONY_LOOK, easeLook, lookFor, REPLAY_LOOK } from "./look";

describe("the picture's grade", () => {
  it("keeps depth of field for replays and the ceremony only", () => {
    expect(lookFor("tv").dof).toBe(0);
    expect(lookFor("closeup").dof).toBe(0);
    expect(lookFor("lobby").dof).toBe(0);
    expect(lookFor("replay-kicker")).toBe(REPLAY_LOOK);
    expect(lookFor("replay-keeper").dof).toBeGreaterThan(0);
    expect(lookFor("ceremony")).toBe(CEREMONY_LOOK);
  });

  it("eases toward a new look and lands on it", () => {
    const look = { ...BROADCAST_LOOK };
    easeLook(look, REPLAY_LOOK, 1 / 60, 6);
    expect(look.dof).toBeGreaterThan(0);
    expect(look.dof).toBeLessThan(0.2);
    for (let i = 0; i < 300; i++) easeLook(look, REPLAY_LOOK, 1 / 60, 6);
    expect(look.dof).toBeCloseTo(1, 3);
    expect(look.vignette).toBeCloseTo(REPLAY_LOOK.vignette, 3);
  });

  it("warms by lifting red and cutting blue, and leaves neutral alone", () => {
    expect(balance(0)).toEqual([1, 1, 1]);
    const [r, , b] = balance(0.5);
    expect(r).toBeGreaterThan(1);
    expect(b).toBeLessThan(1);
    expect(balance(5)).toEqual(balance(1));
  });
});
