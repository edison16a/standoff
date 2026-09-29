import { describe, expect, it } from "vitest";
import { newEntryId, parseBoard, placeEntry, rankEntries, type LeaderEntry } from "./board";

const run = (id: string, value: number, at = 0): LeaderEntry => ({ id, name: id, value, at });

describe("ranking a board", () => {
  it("puts the biggest score first, or the smallest time", () => {
    const entries = [run("a", 5), run("b", 9), run("c", 1)];
    expect(rankEntries(entries, "high").map((e) => e.id)).toEqual(["b", "a", "c"]);
    expect(rankEntries(entries, "low").map((e) => e.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps the older run ahead on a tie", () => {
    expect(rankEntries([run("new", 5, 20), run("old", 5, 10)], "high").map((e) => e.id)).toEqual(["old", "new"]);
  });
});

describe("placing a run", () => {
  const board = rankEntries([run("a", 900, 1), run("b", 500, 2), run("c", 100, 3)], "high");

  it("slots it in by its score and counts the board", () => {
    const placed = placeEntry(board, run("new", 600, 9), "high");
    expect(placed.rank).toBe(2);
    expect(placed.total).toBe(4);
    expect(placed.best).toBe(false);
    expect(placed.entries.map((e) => e.id)).toEqual(["a", "new", "b", "c"]);
  });

  it("calls a run ahead of every other a new best", () => {
    expect(placeEntry(board, run("new", 901, 9), "high").best).toBe(true);
    expect(placeEntry([], run("first", 1, 9), "high")).toMatchObject({ rank: 1, total: 1, best: true });
  });

  it("puts a tie after the run it ties, so a tie is no new best", () => {
    const placed = placeEntry(board, run("tie", 900, 9), "high");
    expect(placed.rank).toBe(2);
    expect(placed.best).toBe(false);
  });

  it("keeps every run, however low", () => {
    expect(placeEntry(board, run("low", 0, 9), "high")).toMatchObject({ rank: 4, total: 4 });
  });

  it("ranks times smallest first", () => {
    const times = rankEntries([run("a", 31.2), run("b", 40)], "low");
    expect(placeEntry(times, run("new", 29.9, 9), "low")).toMatchObject({ rank: 1, best: true });
    expect(placeEntry(times, run("slow", 45, 9), "low").rank).toBe(3);
  });

  it("leaves the board it was given alone", () => {
    placeEntry(board, run("new", 600, 9), "high");
    expect(board).toHaveLength(3);
  });
});

describe("reading a stored board", () => {
  it("drops anything malformed and ranks the rest", () => {
    const raw = [run("a", 5), { id: "x", name: "", value: 3, at: 0 }, "junk", run("b", 8), { id: "c", name: "c", value: "7", at: 0 }];
    expect(parseBoard(raw, "high").map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("reads anything that is not a list as empty", () => {
    expect(parseBoard({ a: 1 }, "high")).toEqual([]);
    expect(parseBoard(null, "high")).toEqual([]);
  });

  it("keeps a tag", () => {
    expect(parseBoard([{ ...run("a", 1), tag: "Hard" }], "high")[0]!.tag).toBe("Hard");
  });
});

describe("run ids", () => {
  it("differ for two runs in the same millisecond", () => {
    let n = 0;
    const random = () => (n++ % 7) / 7;
    expect(newEntryId(1000, random)).not.toBe(newEntryId(1000, random));
  });
});
