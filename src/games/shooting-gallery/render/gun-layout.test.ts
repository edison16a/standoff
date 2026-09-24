import { describe, expect, it } from "vitest";
import { gunSpot } from "./gun-layout";

const row = (count: number, lobby: boolean) => Array.from({ length: count }, (_, i) => gunSpot(i, count, lobby));

describe("gun layout", () => {
  it("spreads the guns left to right with room between them", () => {
    for (const count of [2, 3, 4]) {
      const xs = row(count, false).map((spot) => spot.x);
      for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(0.45);
      expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(1.1);
    }
  });

  it("keeps a lone gun off to the right, clear of the middle", () => {
    expect(gunSpot(0, 1, false).x).toBeGreaterThan(0.4);
  });

  it("gathers the guns left of the lobby panel", () => {
    for (const count of [1, 2, 3, 4]) {
      const xs = row(count, true).map((spot) => spot.x);
      expect(Math.max(...xs)).toBeLessThanOrEqual(0.42 + 1e-9);
      for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    }
  });

  it("draws the guns smaller when more players share the counter", () => {
    expect(gunSpot(0, 4, false).scale).toBeLessThan(gunSpot(0, 1, false).scale);
  });
});
