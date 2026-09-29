import { describe, expect, it } from "vitest";
import { CORNERS } from "../../engine/footwork";
import { ceremonyAt, stageSpot, type CeremonySetup } from "./ceremony";

const setup: CeremonySetup = { winner: 0, from: [{ x: -1.5, z: -0.4 }, { x: -0.6, z: 1.8 }], loserDown: false, showFacing: 0.8 };

describe("the winner's ceremony", () => {
  it("walks the winner to the middle and turns them to the camera", () => {
    const end = ceremonyAt(setup, 12);
    expect(end.spots[0].x).toBeCloseTo(0);
    expect(end.spots[0].z).toBeCloseTo(0);
    const start = ceremonyAt(setup, 0);
    expect(start.spots[0]).toEqual(setup.from[0]);
  });

  it("hands over the belt, dips, then presses it overhead and keeps it there", () => {
    let last = 0;
    let dipped = false;
    let heldAt = Infinity;
    for (let t = 0; t < 10; t += 0.05) {
      const frame = ceremonyAt(setup, t);
      if (frame.holding) heldAt = Math.min(heldAt, t);
      if (frame.dip > 0.5) dipped = true;
      expect(frame.lift).toBeGreaterThanOrEqual(last - 1e-9);
      if (frame.lift > 0) expect(frame.holding).toBe(true);
      last = frame.lift;
    }
    expect(dipped).toBe(true);
    expect(last).toBe(1);
    expect(heldAt).toBeGreaterThan(0.5);
    expect(ceremonyAt(setup, 10).sinceLift).toBeGreaterThan(0);
  });

  it("sends the loser back to their corner to slump on the ropes, facing the middle", () => {
    const end = ceremonyAt(setup, 14);
    const corner = CORNERS[1];
    expect(Math.hypot(end.spots[1].x - corner.x, end.spots[1].z - corner.z)).toBeLessThan(0.6);
    expect(end.ropes).toBe(1);
    const toCentre = Math.atan2(-end.spots[1].x, -end.spots[1].z);
    expect(Math.cos(end.facing[1] - toCentre)).toBeGreaterThan(0.99);
  });

  it("gets a knocked down loser up before they walk", () => {
    const down = { ...setup, loserDown: true };
    expect(ceremonyAt(down, 0).rise).toBe(0);
    expect(ceremonyAt(down, 1).spots[1]).toEqual(setup.from[1]);
    expect(ceremonyAt(down, 2).rise).toBe(1);
    expect(ceremonyAt({ ...setup }, 0).rise).toBe(1);
  });

  it("keeps the winner clear of a loser lying near the middle", () => {
    const near: CeremonySetup = { winner: 1, from: [{ x: 0.2, z: 0.1 }, { x: 0.4, z: 1.2 }], loserDown: true, showFacing: 0 };
    const spot = stageSpot(near);
    expect(Math.hypot(spot.x - 0.2, spot.z - 0.1)).toBeCloseTo(1.4);
    expect(stageSpot(setup)).toEqual({ x: 0, z: 0 });
  });

  it("never gives a broken number", () => {
    const same: CeremonySetup = { winner: 0, from: [{ x: 0, z: 0 }, { x: 0, z: 0 }], loserDown: true, showFacing: 0 };
    for (let t = 0; t < 12; t += 0.25) {
      const frame = ceremonyAt(same, t);
      for (const n of [frame.spots[0].x, frame.spots[0].z, frame.spots[1].x, frame.facing[0], frame.facing[1], frame.lift, frame.pump]) expect(Number.isFinite(n)).toBe(true);
    }
  });
});
