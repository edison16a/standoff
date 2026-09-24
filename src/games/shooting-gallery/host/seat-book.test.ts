import { describe, expect, it } from "vitest";
import type { Player } from "@/platform/games/game-api";
import { SeatBook } from "./seat-book";

const here = (seat: number): Player => ({ seat, name: `P${seat}`, connected: true });

describe("seat book", () => {
  it("only lets a calibrated phone be ready", () => {
    const book = new SeatBook();
    expect(book.apply(1, { kind: "ready", ready: true })).toBe(false);
    book.apply(1, { kind: "setup", step: "ready" });
    expect(book.apply(1, { kind: "ready", ready: true })).toBe(true);
    expect(book.lobby([here(1)])[0]).toMatchObject({ ready: true, step: "ready" });
  });

  it("drops ready when the player goes back to change something", () => {
    const book = new SeatBook();
    book.apply(1, { kind: "setup", step: "ready" });
    book.apply(1, { kind: "ready", ready: true });
    book.apply(1, { kind: "setup", step: "gun" });
    expect(book.seat(1).ready).toBe(false);
  });

  it("remembers each finish and lists seats in order", () => {
    const book = new SeatBook();
    book.apply(3, { kind: "gun", finish: "gold" });
    book.seat(1);
    expect(book.lobby([here(1), here(2), here(3)]).map((s) => [s.seat, s.finish])).toEqual([
      [1, "walnut"],
      [3, "gold"],
    ]);
  });
});
