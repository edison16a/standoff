import { describe, expect, it } from "vitest";
import { BUDGET_MS, governor, measure } from "./resolution-governor";

describe("resolution governor", () => {
  it("draws fewer pixels while frames run over budget, never below its floor", () => {
    const g = governor();
    let changes = 0;
    for (let i = 0; i < 2000; i++) if (measure(g, BUDGET_MS * 2.2)) changes++;
    expect(changes).toBeGreaterThan(1);
    expect(g.scale).toBeGreaterThanOrEqual(0.55);
    expect(g.scale).toBeLessThan(0.6);
  });

  it("ignores a single slow frame", () => {
    const g = governor();
    for (let i = 0; i < 200; i++) measure(g, i === 100 ? 60 : 6);
    expect(g.scale).toBe(1);
  });

  it("gives the pixels back once the card has room again", () => {
    const g = governor();
    for (let i = 0; i < 300; i++) measure(g, 25);
    const low = g.scale;
    for (let i = 0; i < 2000; i++) measure(g, 4);
    expect(low).toBeLessThan(0.8);
    expect(g.scale).toBe(1);
  });

  it("holds steady inside the budget", () => {
    const g = governor();
    for (let i = 0; i < 1000; i++) measure(g, 10);
    expect(g.scale).toBe(1);
  });

  it("asks for the extras to go only once the fewest pixels are still too slow", () => {
    // The card's time grows with the pixels drawn, so a frame costs its full price times the scale squared.
    const card = (cost: number) => {
      const g = governor();
      for (let i = 0; i < 3000; i++) measure(g, cost * g.scale * g.scale);
      return g;
    };
    expect(card(BUDGET_MS * 1.6).shed).toBe(false);
    const slow = card(BUDGET_MS * 5);
    expect(slow.scale).toBeCloseTo(0.55);
    expect(slow.shed).toBe(true);
  });
});
