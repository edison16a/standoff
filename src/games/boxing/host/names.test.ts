import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadNames, nameOrDefault, saveNames } from "./names";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.assign(globalThis, { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) } });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

const room = (names: Record<number, string>) => ({ players: () => Object.entries(names).map(([seat, name]) => ({ seat: Number(seat), name, connected: true })) });

describe("player names", () => {
  it("starts as Player 1 and Player 2", () => {
    expect(loadNames(null)).toEqual(["Player 1", "Player 2"]);
  });

  it("remembers names typed in this browser", () => {
    saveNames(["Ann", "Bo"]);
    expect(loadNames(null)).toEqual(["Ann", "Bo"]);
  });

  it("takes a name from the room first", () => {
    saveNames(["Ann", "Bo"]);
    expect(loadNames(room({ 2: "Cy" }))).toEqual(["Ann", "Cy"]);
  });

  it("tidies what was typed, and falls back for an empty box", () => {
    expect(nameOrDefault("  Big   Dee  ", 1)).toBe("Big Dee");
    expect(nameOrDefault("   ", 2)).toBe("Player 2");
  });

  it("survives storage that throws or holds junk", () => {
    store.set("standoff:boxing:names", "{not json");
    expect(loadNames(null)).toEqual(["Player 1", "Player 2"]);
    Object.assign(globalThis, {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => saveNames(["A", "B"])).not.toThrow();
    expect(loadNames(null)).toEqual(["Player 1", "Player 2"]);
  });
});
