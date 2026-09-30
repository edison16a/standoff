import { describe, expect, it } from "vitest";
import { cycleOf, movesForward, spotAt, type Cut } from "./film";
import { LOOP } from "./loop-script";
import { SHOTS } from "./shots";

const aim = { x: 0, y: 0, zoom: 1 };
const CUTS: Cut[] = [
  { from: 1, seconds: 1, aim },
  { from: 2, seconds: 2, rate: 0.5, aim, to: { x: 2, y: 0, zoom: 2 } },
  { from: 5, seconds: 1, aim },
];

describe("trailer film", () => {
  it("maps real time to script time, with slow motion and skips", () => {
    expect(spotAt(CUTS, 8, 0.5).scriptTime).toBeCloseTo(1.5);
    expect(spotAt(CUTS, 8, 2).scriptTime).toBeCloseTo(2.5);
    expect(spotAt(CUTS, 8, 3.5).scriptTime).toBeCloseTo(5.5);
  });

  it("pushes the camera in smoothly", () => {
    expect(spotAt(CUTS, 8, 1).aim.zoom).toBeCloseTo(1);
    expect(spotAt(CUTS, 8, 2).aim.zoom).toBeCloseTo(1.5);
    expect(spotAt(CUTS, 8, 2.999).aim.zoom).toBeCloseTo(2, 3);
  });

  it("moves the script on one period each pass, so pass two films what pass one did", () => {
    const cycle = cycleOf(CUTS);
    for (const t of [0.2, 1.7, 3.1, 3.9]) expect(spotAt(CUTS, 8, t + cycle).scriptTime).toBeCloseTo(spotAt(CUTS, 8, t).scriptTime + 8);
  });

  it("never runs the script backwards", () => {
    expect(movesForward(CUTS, 8)).toBe(true);
    expect(movesForward([...CUTS, { from: 3, seconds: 1, aim }], 8)).toBe(false);
  });
});

describe("the home screen trailer", () => {
  const film = SHOTS.loop.film!;

  it("runs one loop period, the clip's eight seconds", () => {
    expect(cycleOf(film)).toBeCloseTo(LOOP.period, 6);
  });

  it("only moves forward through the script", () => {
    expect(movesForward(film, LOOP.period)).toBe(true);
  });

  it("starts on a whole period, so the script lines up with the cuts", () => {
    expect(SHOTS.loop.start % LOOP.period).toBe(0);
    expect(SHOTS.loop.labels).toBe(false);
  });
});
