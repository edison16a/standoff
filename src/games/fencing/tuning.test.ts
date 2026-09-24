import { describe, expect, it } from "vitest";
import { clampTuning, DEFAULT_TUNING, TUNING_FIELDS } from "./tuning";

describe("clampTuning", () => {
  it("keeps the defaults inside their own ranges", () => {
    expect(clampTuning(DEFAULT_TUNING)).toEqual(DEFAULT_TUNING);
    for (const field of TUNING_FIELDS) {
      expect(DEFAULT_TUNING[field.key]).toBeGreaterThanOrEqual(field.min);
      expect(DEFAULT_TUNING[field.key]).toBeLessThanOrEqual(field.max);
    }
  });

  it("pulls out of range and broken values back", () => {
    const clamped = clampTuning({ ...DEFAULT_TUNING, jabThreshold: 0, parryWindowMs: 1e9, sfxVolume: Number.NaN });
    expect(clamped.jabThreshold).toBe(4);
    expect(clamped.parryWindowMs).toBe(2000);
    expect(clamped.sfxVolume).toBe(DEFAULT_TUNING.sfxVolume);
  });
});
