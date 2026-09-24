import { describe, expect, it } from "vitest";
import { StrikeDetector } from "./strike-detector";

const settings = { jabThreshold: 14, parryThreshold: 12, refractoryMs: 350 };

/** Plays a list of acceleration values at 60 Hz and collects strikes. */
function play(detector: StrikeDetector, values: number[], start = 0) {
  return values.map((a, i) => detector.update(a, start + i * 16)).filter(Boolean);
}

describe("StrikeDetector", () => {
  it("reads a fast forward spike as a jab", () => {
    expect(play(new StrikeDetector(settings), [0, 0, 8, 25, 30, 10, 0])).toEqual(["jab"]);
  });

  it("reads a fast backward spike as a parry", () => {
    expect(play(new StrikeDetector(settings), [0, 0, -10, -24, -20, 0])).toEqual(["parry"]);
  });

  it("ignores the braking spike that follows a jab", () => {
    const jabThenBrake = [0, 10, 28, 30, 5, -20, -28, -15, 0];
    expect(play(new StrikeDetector(settings), jabThenBrake)).toEqual(["jab"]);
  });

  it("fires again once the refractory period is over", () => {
    const detector = new StrikeDetector(settings);
    play(detector, [0, 20, 30, 0]);
    expect(play(detector, [0, 0, 20, 30, 0], 500)).toEqual(["jab"]);
  });

  it("does not count a slow build up as a strike", () => {
    const ramp = Array.from({ length: 40 }, (_, i) => i * 0.5);
    expect(play(new StrikeDetector(settings), ramp)).toEqual([]);
  });
});
