import { describe, expect, it } from "vitest";
import { footShadow } from "./contact-shadows";

describe("contact shadows", () => {
  it("are full under a planted foot and gone once it lifts", () => {
    expect(footShadow(0.08)).toBeCloseTo(0.42);
    expect(footShadow(0.25)).toBeLessThan(footShadow(0.15));
    expect(footShadow(0.5)).toBe(0);
  });
});
