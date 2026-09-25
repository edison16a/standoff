import { describe, expect, it } from "vitest";
import { Tutorial } from "./tutorial";

describe("tutorial", () => {
  it("ticks the moves off in order", () => {
    const t = new Tutorial();
    expect(t.step).toBe("left");
    expect(t.see({ type: "jump" })).toBe(false);
    expect(t.see({ type: "lane", lane: 1 })).toBe(false);
    expect(t.see({ type: "lane", lane: -1 })).toBe(true);
    expect(t.step).toBe("right");
    expect(t.see({ type: "lane", lane: 0 })).toBe(false);
    expect(t.see({ type: "lane", lane: 1 })).toBe(true);
    expect(t.see({ type: "duck" })).toBe(false);
    expect(t.see({ type: "jump" })).toBe(true);
    expect(t.finished).toBe(false);
    expect(t.see({ type: "duck" })).toBe(true);
    expect(t.finished).toBe(true);
    expect(t.step).toBeNull();
  });
});
