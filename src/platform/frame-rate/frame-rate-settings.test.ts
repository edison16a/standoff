import { describe, expect, it } from "vitest";
import { capChoices, effectiveCap } from "./frame-rate-settings";

describe("capChoices", () => {
  it("offers only caps below the screen's rate", () => {
    expect(capChoices(144)).toEqual([120, 90, 60, 30]);
    expect(capChoices(120)).toEqual([90, 60, 30]);
    expect(capChoices(60)).toEqual([30]);
  });

  it("offers them all before the screen is known", () => {
    expect(capChoices(null)).toEqual([120, 90, 60, 30]);
  });
});

describe("effectiveCap", () => {
  it("treats Max and caps at or above the screen as no cap", () => {
    expect(effectiveCap(null, 144)).toBeNull();
    expect(effectiveCap(120, 60)).toBeNull();
    expect(effectiveCap(60, 60)).toBeNull();
  });

  it("keeps a cap below the screen, or when the screen is unknown", () => {
    expect(effectiveCap(60, 144)).toBe(60);
    expect(effectiveCap(90, null)).toBe(90);
  });
});
