import { describe, expect, it } from "vitest";
import { FIELD, YARD } from "../../engine/field";
import { END_ZONES, hashMarks, numerals, yardLines } from "./marks";

describe("field marks", () => {
  it("draws a line every 5 yards from goal line to goal line, goal lines wider", () => {
    const lines = yardLines();
    expect(lines).toHaveLength(21);
    expect(lines[0]!.x).toBeCloseTo(-FIELD.goalX);
    expect(lines[20]!.x).toBeCloseTo(FIELD.goalX);
    expect(lines[10]!.x).toBeCloseTo(0);
    expect(lines[0]!.width).toBeGreaterThan(lines[1]!.width);
    for (let i = 1; i < lines.length; i++) expect(lines[i]!.x - lines[i - 1]!.x).toBeCloseTo(5 * YARD);
  });

  it("puts hash marks at every yard between the 5 yard lines, four rows of them", () => {
    const marks = hashMarks();
    // 99 yards minus the 19 that have full lines, four ticks each.
    expect(marks).toHaveLength(80 * 4);
    const rows = new Set(marks.map((m) => Math.round(m.z0 * 100)));
    expect(rows.size).toBe(4);
    expect(marks.some((m) => Math.abs(Math.abs(m.z0) - FIELD.hashZ) < 1e-6)).toBe(true);
  });

  it("numbers the field 10 to 50 and back, both sides, the far ones turned round", () => {
    const n = numerals();
    expect(n.map((x) => x.text).filter((_, i) => i % 2 === 0)).toEqual(["10", "20", "30", "40", "50", "40", "30", "20", "10"]);
    for (const x of n) {
      expect(Math.abs(x.z)).toBeLessThan(FIELD.halfWidth);
      expect(x.flip).toBe(x.z < 0);
    }
  });

  it("paints Storm's end zone at negative x and Blaze's at positive x", () => {
    const storm = END_ZONES.find((e) => e.team === 0)!;
    const blaze = END_ZONES.find((e) => e.team === 1)!;
    expect(storm.x1).toBeCloseTo(-FIELD.goalX);
    expect(blaze.x0).toBeCloseTo(FIELD.goalX);
    expect(blaze.x1 - blaze.x0).toBeCloseTo(10 * YARD);
  });
});
