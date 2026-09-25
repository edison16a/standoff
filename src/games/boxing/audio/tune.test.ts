import { describe, expect, it } from "vitest";
import { BPM, SIXTEENTH, STEPS } from "./tune";

describe("gym tune", () => {
  it("loops on whole bars: sixteen bars of sixteenths, A and B sections of eight", () => {
    expect(STEPS).toBe(16 * 16);
    expect(SIXTEENTH).toBeCloseTo(60 / BPM / 4);
  });
});
