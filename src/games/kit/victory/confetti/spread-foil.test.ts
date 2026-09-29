import { describe, expect, it } from "vitest";
import { spreadFoil } from "./victory-confetti";

describe("spreadFoil", () => {
  it("makes the asked share foil", () => {
    const { paper, foil } = spreadFoil(1000, 0.2);
    expect(foil).toBe(200);
    expect(paper).toBe(800);
  });

  it("spreads foil through the pieces, so any run of them gets its share", () => {
    const { isFoil } = spreadFoil(1600, 0.2);
    for (const start of [0, 700, 1300]) {
      let n = 0;
      for (let i = start; i < start + 100; i++) n += isFoil[i]!;
      expect(n).toBe(20);
    }
  });

  it("gives every piece its own slot in its mesh", () => {
    const { isFoil, slot, paper, foil } = spreadFoil(50, 0.3);
    const seen = [new Set<number>(), new Set<number>()];
    for (let i = 0; i < 50; i++) seen[isFoil[i]!]!.add(slot[i]!);
    expect(seen[0]!.size).toBe(paper);
    expect(seen[1]!.size).toBe(foil);
    expect(Math.max(...seen[1]!)).toBe(foil - 1);
  });

  it("handles no foil and all foil", () => {
    expect(spreadFoil(10, 0).foil).toBe(0);
    expect(spreadFoil(10, 1).paper).toBe(0);
  });
});
