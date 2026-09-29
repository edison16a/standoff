import { describe, expect, it } from "vitest";
import type { LeaderEntry } from "./board";
import { boardLines, type BoardLine } from "./rows";

const board = (count: number): LeaderEntry[] => Array.from({ length: count }, (_, i) => ({ id: `r${i + 1}`, name: `P${i + 1}`, value: count - i, at: i }));
const ranks = (lines: BoardLine[]) => lines.map((line) => (line.kind === "run" ? line.rank : `gap ${line.skipped}`));

describe("the lines of a drawn board", () => {
  it("draws a short board whole", () => {
    expect(ranks(boardLines(board(5), "r3", 10, 2))).toEqual([1, 2, 3, 4, 5]);
  });

  it("draws the top of a long board, then a gap for the rest", () => {
    expect(ranks(boardLines(board(50), null, 10, 2))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "gap 40"]);
  });

  it("keeps a lit row near the top in the top part", () => {
    expect(ranks(boardLines(board(50), "r7", 10, 2))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "gap 40"]);
  });

  it("jumps to a lit row far down, with the runs either side of it", () => {
    expect(ranks(boardLines(board(50), "r30", 10, 2))).toEqual([1, 2, 3, 4, 5, "gap 22", 28, 29, 30, 31, 32, "gap 18"]);
  });

  it("ends without a gap when the lit row is last", () => {
    expect(ranks(boardLines(board(50), "r50", 10, 2))).toEqual([1, 2, 3, 4, 5, "gap 42", 48, 49, 50]);
  });

  it("never draws an empty gap", () => {
    const lines = boardLines(board(50), "r8", 10, 2);
    expect(lines.some((line) => line.kind === "gap" && line.skipped === 0)).toBe(false);
    expect(ranks(lines)).toContain(8);
  });
});
