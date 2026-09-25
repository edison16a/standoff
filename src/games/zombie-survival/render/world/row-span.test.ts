import { describe, expect, it } from "vitest";
import { SEGMENTS } from "../../engine/route";
import { fitBlock, MIN_BLOCK, rowSpan } from "./row-span";

/** Lays a row the way the builders do, with widths from a fixed sequence. */
function lay(index: number, a0: number, a1: number, gap: number, widths: () => number): [number, number][] {
  const seg = SEGMENTS[index - 1]!;
  const span = rowSpan(seg, a0, a1, gap);
  const blocks: [number, number][] = [];
  let along = span.from;
  while (along < span.to) {
    const w = fitBlock(span, along, widths(), gap);
    blocks.push([along, along + w]);
    along += w + gap;
  }
  return blocks;
}

describe("rows of buildings", () => {
  const straight = SEGMENTS.filter((s, i) => i > 0 && Math.abs(SEGMENTS[i - 1]!.heading - s.heading) < 1e-3);

  it("never run into the next segment when the road carries straight on", () => {
    expect(straight.length).toBeGreaterThan(3);
    for (const next of straight) {
      const seg = SEGMENTS[next.index - 2]!;
      let k = 0;
      const blocks = lay(seg.index, -6, seg.length + 6, 0.4, () => 8 + ((k++ * 0.37) % 1) * 8);
      const last = blocks[blocks.length - 1]!;
      expect(last[1]).toBeLessThanOrEqual(seg.length);
      // No sliver of a gap is left before the edge either.
      expect(seg.length - last[1]).toBeLessThan(1);
      for (const [a, b] of blocks) expect(b - a).toBeGreaterThanOrEqual(MIN_BLOCK);
    }
  });

  it("start inside the segment when the road came in straight", () => {
    for (const seg of straight) expect(lay(seg.index, -6, seg.length + 6, 0.4, () => 10)[0]![0]).toBeGreaterThanOrEqual(0);
  });

  it("still run past a corner to fill it", () => {
    const corner = SEGMENTS.find((s, i) => SEGMENTS[i + 1] && Math.abs(SEGMENTS[i + 1]!.heading - s.heading) > 1e-3)!;
    const span = rowSpan(corner, -6, corner.length + 6, 0.4);
    expect(span.to).toBe(corner.length + 6);
    expect(span.fit).toBe(false);
  });
});
