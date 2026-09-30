import { describe, expect, it } from "vitest";
import { continues, cycleOf, placeAt, spotAt, type Cut, type Place } from "./timeline";
import { TRAILER } from "./trailer";

const near: Place = { at: [0, 1, -2], look: [0, 1, 0], fov: 40 };
const far: Place = { at: [0, 3, -8], look: [0, 1, 0], fov: 60 };
const CUTS: Cut[] = [
  { seed: 1, from: 2, seconds: 1, angle: "chase" },
  { seed: 1, from: 3, seconds: 2, rate: 0.25, angle: near, to: far },
  { seed: 4, from: 9, seconds: 1, angle: near },
];

describe("trailer timeline", () => {
  it("finds the cut and the run second on screen, with slow motion", () => {
    expect(spotAt(CUTS, 0.5)).toMatchObject({ index: 0, runTime: 2.5 });
    expect(spotAt(CUTS, 2)).toMatchObject({ index: 1, runTime: 3.25, progress: 0.5 });
    expect(spotAt(CUTS, 3.5)).toMatchObject({ index: 2, runTime: 9.5 });
  });

  it("repeats every cycle, so the clip loops", () => {
    const cycle = cycleOf(CUTS);
    for (const t of [0.1, 1.4, 3.9]) {
      const [a, b] = [spotAt(CUTS, t), spotAt(CUTS, t + cycle)];
      expect(b.index).toBe(a.index);
      expect(b.runTime).toBeCloseTo(a.runTime, 9);
    }
  });

  it("carries a run on only into a cut that opens where it ended", () => {
    expect(continues(CUTS[0]!, CUTS[1]!)).toBe(true);
    expect(continues(CUTS[1]!, CUTS[2]!)).toBe(false);
    expect(continues(CUTS[0]!, { ...CUTS[1]!, pickups: "boots" })).toBe(false);
  });

  it("moves a placed camera smoothly, and leaves the chase camera to the game", () => {
    expect(placeAt(CUTS[0]!, 0.5)).toBeNull();
    expect(placeAt(CUTS[1]!, 0)!.fov).toBe(40);
    expect(placeAt(CUTS[1]!, 0.5)!.at[2]).toBeCloseTo(-5);
    expect(placeAt(CUTS[1]!, 1)!.fov).toBe(60);
  });
});

describe("the home screen trailer", () => {
  it("runs eight seconds, the clip's length", () => {
    expect(cycleOf(TRAILER)).toBeCloseTo(8, 6);
  });

  it("carries each slow motion beat straight on from the cut before it", () => {
    TRAILER.forEach((cut, i) => {
      if ((cut.rate ?? 1) < 1) expect(continues(TRAILER[i - 1]!, cut)).toBe(true);
    });
  });
});
