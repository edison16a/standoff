import { describe, expect, it } from "vitest";
import { levelById } from "../levels";
import { STILLS, TRAILER } from "./cuts";
import { angleAt, continues, cycleOf, placeAt, type Cut } from "./timeline";

const angle = { height: 6, across: 0.4, floor: 1.4 };
const CUTS: Cut[] = [
  { level: "a", from: 2, seconds: 1, angle },
  { level: "a", from: 3, seconds: 2, rate: 0.5, angle, to: { height: 10 } },
  { level: "b", from: 7, seconds: 1, angle },
];

describe("trailer timeline", () => {
  it("adds the cuts up to one cycle", () => {
    expect(cycleOf(CUTS)).toBe(4);
  });

  it("finds the cut and the level second on screen", () => {
    expect(placeAt(CUTS, 0.5)).toMatchObject({ index: 0, levelTime: 2.5 });
    expect(placeAt(CUTS, 2)).toMatchObject({ index: 1, levelTime: 3.5, progress: 0.5 });
    expect(placeAt(CUTS, 3.5)).toMatchObject({ index: 2, levelTime: 7.5 });
  });

  it("repeats every cycle, so the clip loops", () => {
    for (const t of [0, 0.7, 1.9, 3.2]) {
      const [a, b] = [placeAt(CUTS, t), placeAt(CUTS, t + 8)];
      expect(b.index).toBe(a.index);
      expect(b.levelTime).toBeCloseTo(a.levelTime, 9);
    }
  });

  it("carries on only when the next cut opens where the last one ended", () => {
    expect(continues(CUTS[0]!, CUTS[1]!)).toBe(true);
    expect(continues(CUTS[1]!, CUTS[2]!)).toBe(false);
  });

  it("pushes the camera smoothly from one framing to the next", () => {
    expect(angleAt(CUTS[1]!, 0).height).toBe(6);
    expect(angleAt(CUTS[1]!, 0.5).height).toBeCloseTo(8);
    expect(angleAt(CUTS[1]!, 1).height).toBe(10);
  });
});

describe("the home screen cuts", () => {
  it("run eight seconds, the clip's length", () => {
    expect(cycleOf(TRAILER)).toBeCloseTo(8, 6);
  });

  it("only show moments inside real levels", () => {
    for (const cut of [...TRAILER, ...Object.values(STILLS)]) {
      const level = levelById(cut.level);
      expect(level.id).toBe(cut.level);
      expect(cut.from + cut.seconds * (cut.rate ?? 1)).toBeLessThan((level.beats * 60) / level.bpm);
    }
  });

  it("carries the slow motion straight on from the cut before it", () => {
    expect(continues(TRAILER[0]!, TRAILER[1]!)).toBe(true);
    expect(continues(TRAILER[4]!, TRAILER[5]!)).toBe(true);
    expect(continues(TRAILER[5]!, TRAILER[6]!)).toBe(true);
  });
});
