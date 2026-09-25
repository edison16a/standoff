import { describe, expect, it } from "vitest";
import { crowdFade, hitFlash } from "./hit-flash";

describe("hit flash", () => {
  it("glows harder for bigger hits but never fully white", () => {
    expect(hitFlash(16, 1)).toBeGreaterThan(hitFlash(4, 1));
    expect(hitFlash(40, 1)).toBeLessThan(0.6);
  });

  it("dims each fighter when one hit lands on several at once", () => {
    expect(hitFlash(22, 3)).toBeLessThan(hitFlash(22, 1) * 0.6);
    expect(crowdFade(1)).toBe(1);
    expect(crowdFade(0)).toBe(1);
    expect(crowdFade(4)).toBe(0.5);
  });
});
