import { describe, expect, it } from "vitest";
import { cleanName, NAME_MAX } from "./profile";

describe("cleanName", () => {
  it("tidies spacing and strips control characters", () => {
    expect(cleanName("  Edison \u0007  Law ")).toBe("Edison Law");
  });

  it("caps the length so a name fits a chip", () => {
    expect(cleanName("x".repeat(40))).toHaveLength(NAME_MAX);
  });
});
