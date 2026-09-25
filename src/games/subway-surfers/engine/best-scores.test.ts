import { describe, expect, it } from "vitest";
import { addBests, BEST_MAX, isNamed, parseTable, type BestEntry } from "./best-scores";

const entry = (name: string, score: number, at = 1): BestEntry => ({ name, score, coins: 10, distance: 500, at });

describe("best scores", () => {
  it("drops malformed rows and sorts the rest", () => {
    const table = parseTable([entry("Ana", 50), { name: "", score: 3 }, entry("Bo", 90), "junk"]);
    expect(table.map((e) => e.name)).toEqual(["Bo", "Ana"]);
    expect(parseTable({ not: "a list" })).toEqual([]);
  });

  it("places a round's runs after both are in", () => {
    const start = [entry("Old", 100)];
    const a = entry("Ana", 150, 5);
    const b = entry("Bo", 200, 5);
    const { table, places } = addBests(start, [a, b]);
    expect(table.map((e) => e.name)).toEqual(["Bo", "Ana", "Old"]);
    expect(places).toEqual([2, 1]);
  });

  it("keeps only the best few and never a zero", () => {
    const full = Array.from({ length: BEST_MAX }, (_, i) => entry(`P${i}`, 1000 + i));
    const { table, places } = addBests(full, [entry("Low", 5), entry("Zero", 0)]);
    expect(table).toHaveLength(BEST_MAX);
    expect(places).toEqual([null, null]);
  });

  it("an older score holds its place on a tie", () => {
    const { places } = addBests([entry("First", 100, 1)], [entry("Second", 100, 2)]);
    expect(places).toEqual([2]);
  });

  it("knows a typed name from a default one", () => {
    expect(isNamed("Mia", 1)).toBe(true);
    expect(isNamed("  ", 1)).toBe(false);
    expect(isNamed("Player 2", 2)).toBe(false);
  });
});
