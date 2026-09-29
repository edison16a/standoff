import { describe, expect, it } from "vitest";
import { EMPTY_PROGRESS, loadProgress, record, saveProgress } from "./progress";

function memory(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
    key: () => null,
    length: 0,
  };
}

describe("progress", () => {
  it("keeps the better percent", () => {
    let progress = record(EMPTY_PROGRESS, "first-light", 40, false);
    progress = record(progress, "first-light", 25, false);
    expect(progress.best["first-light"]).toBe(40);
    progress = record(progress, "first-light", 100, false);
    expect(progress.best["first-light"]).toBe(100);
  });

  it("does not count practice", () => {
    expect(record(EMPTY_PROGRESS, "first-light", 100, true)).toEqual(EMPTY_PROGRESS);
  });

  it("round trips through storage and shrugs off rubbish", () => {
    const storage = memory();
    saveProgress({ best: { a: 55 } }, storage);
    expect(loadProgress(storage)).toEqual({ best: { a: 55 } });
    // A save from when levels had to be opened one by one still loads, with every level open.
    storage.setItem("standoff.cube-game.progress", JSON.stringify({ best: { a: 20 }, unlocked: 1 }));
    expect(loadProgress(storage)).toEqual({ best: { a: 20 } });
    storage.setItem("standoff.cube-game.progress", "{not json");
    expect(loadProgress(storage)).toEqual(EMPTY_PROGRESS);
  });
});
