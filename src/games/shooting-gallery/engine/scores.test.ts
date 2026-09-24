import { describe, expect, it } from "vitest";
import { addBest, BEST_MAX, parseBook, tableFor, type BestEntry } from "./high-scores";
import { rank, winners, type Tally } from "./scoring";

const tally = (seat: number, score: number, shots: number, hits: number): Tally => ({ seat, score, shots, hits, specials: 0 });

describe("rank", () => {
  it("orders by score, then accuracy, and shares places on equal scores", () => {
    const standings = rank([tally(1, 50, 10, 5), tally(2, 80, 10, 6), tally(3, 50, 5, 5)]);
    expect(standings.map((s) => s.seat)).toEqual([2, 3, 1]);
    expect(standings.map((s) => s.place)).toEqual([1, 2, 2]);
    expect(standings[1]!.accuracy).toBe(1);
  });

  it("reports no accuracy for someone who never fired", () => {
    expect(rank([tally(1, 0, 0, 0)])[0]!.accuracy).toBe(0);
  });

  it("declares a tie as two winners, and nobody when nobody scored", () => {
    expect(winners(rank([tally(1, 40, 4, 2), tally(2, 40, 8, 2)]))).toEqual([1, 2]);
    expect(winners(rank([tally(1, 0, 3, 0)]))).toEqual([]);
  });
});

describe("high scores", () => {
  const entry = (score: number, at = 0, seconds = 20): BestEntry => ({ name: "Ann", score, accuracy: 0.5, seconds, at });

  it("places a new score and keeps the table short", () => {
    let book = {};
    for (let i = 0; i < BEST_MAX + 3; i++) book = addBest(book, entry(i * 10 + 10, i)).book;
    expect(tableFor(book, 20)).toHaveLength(BEST_MAX);
    const { place } = addBest(book, entry(1000, 99));
    expect(place).toBe(1);
    expect(addBest(book, entry(5, 99)).place).toBeNull();
  });

  it("keeps each round length apart and never records a zero", () => {
    const { book } = addBest({}, entry(30, 0, 45));
    expect(tableFor(book, 20)).toHaveLength(0);
    expect(tableFor(book, 45)).toHaveLength(1);
    expect(addBest(book, entry(0)).place).toBeNull();
  });

  it("an equal score goes below the one already there", () => {
    const { book } = addBest({}, entry(50, 1));
    expect(addBest(book, entry(50, 2)).place).toBe(2);
  });

  it("survives junk in storage", () => {
    expect(parseBook("nope")).toEqual({});
    expect(parseBook({ 20: [{ name: "x" }] })).toEqual({});
    expect(tableFor(parseBook({ 20: [entry(10), entry(30)] }), 20)[0]!.score).toBe(30);
  });
});
