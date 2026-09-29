import { describe, expect, it } from "vitest";
import { TEXT_MAX } from "./board";
import { boardKey, clearBoards, countRuns, memoryBoards, readBoard, recordEntry, type BoardRef, type BoardStorage } from "./store";

const RUNS: BoardRef = { game: "runner", board: "runs", order: "high" };
const LEVEL: BoardRef = { game: "cubes", board: "level-1", order: "low" };

describe("a game's board on this computer", () => {
  it("starts empty", () => {
    expect(readBoard(RUNS, memoryBoards())).toEqual([]);
  });

  it("keeps every run and ranks it", () => {
    const storage = memoryBoards();
    recordEntry(RUNS, { name: "Ana", value: 500, at: 1 }, storage);
    recordEntry(RUNS, { name: "Bo", value: 900, at: 2 }, storage);
    const third = recordEntry(RUNS, { name: "Cy", value: 700, at: 3, tag: "Hard" }, storage);
    expect(third).toMatchObject({ rank: 2, total: 3, best: false });
    const board = readBoard(RUNS, storage);
    expect(board.map((e) => e.name)).toEqual(["Bo", "Cy", "Ana"]);
    expect(board[1]).toMatchObject({ id: third.entry.id, tag: "Hard" });
  });

  it("says when a run is a new best", () => {
    const storage = memoryBoards();
    expect(recordEntry(RUNS, { name: "Ana", value: 500 }, storage).best).toBe(true);
    expect(recordEntry(RUNS, { name: "Bo", value: 400 }, storage).best).toBe(false);
    expect(recordEntry(RUNS, { name: "Cy", value: 501 }, storage).best).toBe(true);
  });

  it("keeps boards apart by game and by board, with their own order", () => {
    const storage = memoryBoards();
    recordEntry(RUNS, { name: "Ana", value: 10 }, storage);
    recordEntry(LEVEL, { name: "Ana", value: 30.5 }, storage);
    const quicker = recordEntry(LEVEL, { name: "Bo", value: 21.2 }, storage);
    expect(quicker.rank).toBe(1);
    expect(readBoard(RUNS, storage)).toHaveLength(1);
    expect(readBoard({ ...LEVEL, board: "level-2" }, storage)).toEqual([]);
  });

  it("cuts a long name or tag to fit, so the run still reads back", () => {
    const storage = memoryBoards();
    const placed = recordEntry(RUNS, { name: `  ${"N".repeat(60)} `, value: 5, tag: "T".repeat(50) }, storage);
    const [saved] = readBoard(RUNS, storage);
    expect(saved).toMatchObject({ id: placed.entry.id, name: "N".repeat(TEXT_MAX), tag: "T".repeat(TEXT_MAX) });
    expect(recordEntry(RUNS, { name: "   ", value: 1 }, storage).entry.name).toBe("Player");
    expect(readBoard(RUNS, storage)).toHaveLength(2);
  });

  it("reads a board broken by hand as empty, and writes over it", () => {
    const storage = memoryBoards();
    storage.setItem(boardKey(RUNS), "{not json");
    expect(readBoard(RUNS, storage)).toEqual([]);
    expect(recordEntry(RUNS, { name: "Ana", value: 5 }, storage).rank).toBe(1);
  });

  it("still says where a run landed when storage is full", () => {
    const storage = memoryBoards();
    for (let i = 0; i < 3; i++) recordEntry(RUNS, { name: `P${i}`, value: i, at: i }, storage);
    // Storage that refuses anything longer than it already holds, like a full disk.
    const full: BoardStorage = Object.assign(Object.create(storage) as BoardStorage, {
      setItem(key: string, value: string) {
        if (value.length > (storage.getItem(key)?.length ?? 0)) throw new Error("QuotaExceededError");
        storage.setItem(key, value);
      },
    });
    const placed = recordEntry(RUNS, { name: "New", value: 99 }, full);
    expect(placed.rank).toBe(1);
    expect(readBoard(RUNS, storage)).toHaveLength(3);
  });
});

describe("clearing boards", () => {
  it("wipes every game's boards and nothing else", () => {
    const storage = memoryBoards();
    recordEntry(RUNS, { name: "Ana", value: 10 }, storage);
    recordEntry(LEVEL, { name: "Ana", value: 30 }, storage);
    storage.setItem("standoff:audio", "keep me");
    expect(countRuns(storage)).toBe(2);
    expect(clearBoards(undefined, storage)).toBe(2);
    expect(readBoard(RUNS, storage)).toEqual([]);
    expect(readBoard(LEVEL, storage)).toEqual([]);
    expect(countRuns(storage)).toBe(0);
    expect(storage.getItem("standoff:audio")).toBe("keep me");
  });

  it("can wipe one game only", () => {
    const storage = memoryBoards();
    recordEntry(RUNS, { name: "Ana", value: 10 }, storage);
    recordEntry(LEVEL, { name: "Ana", value: 30 }, storage);
    expect(clearBoards("cubes", storage)).toBe(1);
    expect(readBoard(RUNS, storage)).toHaveLength(1);
  });
});
