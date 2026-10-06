import { describe, expect, it } from "vitest";
import { PITCH } from "../../engine/tuning";
import { pitchLines } from "./pitch-lines";

describe("the pitch markings", () => {
  const { segments, rings, field } = pitchLines();

  it("has a boundary and a halfway line, all inside the boards", () => {
    expect(segments).toHaveLength(5);
    for (const s of segments) {
      for (const [x, z] of [[s.ax, s.az], [s.bx, s.bz]] as const) {
        expect(Math.abs(x)).toBeLessThanOrEqual(PITCH.halfLength);
        expect(Math.abs(z)).toBeLessThanOrEqual(PITCH.halfWidth);
      }
    }
    expect(segments.some((s) => s.ax === 0 && s.bx === 0)).toBe(true);
  });

  it("puts the goal lines through the goal mouths", () => {
    expect(PITCH.halfLength - field.x).toBeLessThan(PITCH.postRadius);
  });

  it("draws the centre circle, the keepers' areas and the spots to the rules' sizes", () => {
    expect(rings.find((r) => r.x === 0 && !r.filled)?.r).toBe(PITCH.centreRadius);
    const areas = rings.filter((r) => r.r === PITCH.boxRadius);
    expect(areas.map((r) => Math.sign(r.x)).sort()).toEqual([-1, 1]);
    const spots = rings.filter((r) => r.filled && r.x !== 0);
    for (const s of spots) expect(Math.abs(s.x)).toBeCloseTo(PITCH.halfLength - PITCH.penaltySpot);
    expect(rings.filter((r) => r.r === 0.6)).toHaveLength(4);
  });
});
