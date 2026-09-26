import { describe, expect, it } from "vitest";
import { createFighter } from "../engine/fighter";
import { buzzesFor } from "./buzz";

const fighters = [
  createFighter(0, { team: 0, seat: 1, name: "A", character: "pro", gun: "rifle" }),
  createFighter(1, { team: 1, seat: null, name: "B", character: "heavy", gun: "smg" }),
  createFighter(2, { team: 1, seat: 3, name: "C", character: "runner", gun: "sniper" }),
];

describe("the phone buzzes", () => {
  it("lets the shooter feel a hit land and the target feel it arrive, and never buzzes a computer", () => {
    expect(buzzesFor({ type: "hit", shooter: 0, target: 2, damage: 40, head: true, health: 60 }, fighters)).toEqual([
      { seat: 1, kind: "head" },
      { seat: 3, kind: "hurt" },
    ]);
    expect(buzzesFor({ type: "hit", shooter: 1, target: 0, damage: 14, head: false, health: 50 }, fighters)).toEqual([{ seat: 1, kind: "hurt" }]);
  });

  it("buzzes a kill in place of its hit, and the result for everyone", () => {
    expect(buzzesFor({ type: "hit", shooter: 0, target: 2, damage: 40, head: false, health: 0 }, fighters)).toEqual([]);
    expect(buzzesFor({ type: "kill", killer: 0, victim: 2, gun: "rifle", head: false }, fighters)).toEqual([
      { seat: 1, kind: "kill" },
      { seat: 3, kind: "down" },
    ]);
    expect(buzzesFor({ type: "match-end", winner: 1, score: [3, 5] }, fighters)).toEqual([
      { seat: 1, kind: "lose" },
      { seat: 3, kind: "win" },
    ]);
  });
});
