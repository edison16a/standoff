import { describe, expect, it } from "vitest";
import { FACING, Facing, shortWay } from "./facing";

describe("the drawn facing", () => {
  it("turns the short way round", () => {
    expect(shortWay(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6);
    expect(shortWay(0, 1)).toBeCloseTo(1, 6);
  });

  it("follows an engine snap over a few frames instead of popping round", () => {
    const f = new Facing();
    f.update(0, 0, 0, 1 / 60);
    const first = f.update(Math.PI * 0.95, 0, 0, 1 / 60);
    expect(first).toBeGreaterThan(0.2);
    expect(first).toBeLessThan(1.2);
    let at = first;
    for (let i = 0; i < 15; i++) at = f.update(Math.PI * 0.95, 0, 0, 1 / 60);
    expect(at).toBeCloseTo(Math.PI * 0.95, 1);
  });

  it("snaps when the man is moved somewhere new", () => {
    const f = new Facing();
    f.update(0, 0, 0, 1 / 60);
    expect(f.update(2, FACING.snap + 1, 0, 1 / 60)).toBe(2);
  });
});
