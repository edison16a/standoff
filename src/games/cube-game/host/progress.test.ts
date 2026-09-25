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
  it("keeps the better percent and opens the next level on a finish", () => {
    let progress = record(EMPTY_PROGRESS, "first-light", 0, 40, false);
    progress = record(progress, "first-light", 0, 25, false);
    expect(progress.best["first-light"]).toBe(40);
    expect(progress.unlocked).toBe(1);
    progress = record(progress, "first-light", 0, 100, false);
    expect(progress.unlocked).toBe(2);
  });

  it("does not count practice", () => {
    expect(record(EMPTY_PROGRESS, "first-light", 0, 100, true)).toEqual(EMPTY_PROGRESS);
  });

  it("round trips through storage and shrugs off rubbish", () => {
    const storage = memory();
    saveProgress({ best: { a: 55 }, unlocked: 3 }, storage);
    expect(loadProgress(storage)).toEqual({ best: { a: 55 }, unlocked: 3 });
    storage.setItem("standoff.cube-game.progress", "{not json");
    expect(loadProgress(storage)).toEqual(EMPTY_PROGRESS);
  });
});
