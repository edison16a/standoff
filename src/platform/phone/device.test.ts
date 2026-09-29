import { describe, expect, it } from "vitest";
import { looksLikePhone, type DeviceHints } from "./device";

const desktop: DeviceHints = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
  coarse: false,
  longSide: 1728,
  maxTouchPoints: 0,
};

describe("looksLikePhone", () => {
  it("knows an iPhone and an Android phone", () => {
    expect(looksLikePhone({ ...desktop, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148" })).toBe(true);
    expect(looksLikePhone({ ...desktop, userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/130 Mobile Safari/537.36" })).toBe(true);
  });

  it("keeps a computer on the big screen home", () => {
    expect(looksLikePhone(desktop)).toBe(false);
  });

  it("keeps an iPad that calls itself a Mac on the big screen home", () => {
    expect(looksLikePhone({ ...desktop, coarse: true, maxTouchPoints: 5, longSide: 1366 })).toBe(false);
  });

  it("catches a small touch screen whatever it calls itself", () => {
    expect(looksLikePhone({ ...desktop, coarse: true, maxTouchPoints: 5, longSide: 852 })).toBe(true);
  });
});
