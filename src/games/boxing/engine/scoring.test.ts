import { describe, expect, it } from "vitest";
import { Fighter } from "./fighter";
import { decision, scoreRound } from "./scoring";

function pair(damageA: number[], damageB: number[]): [Fighter, Fighter] {
  const a = new Fighter(0);
  const b = new Fighter(1);
  a.roundDamage = damageA;
  b.roundDamage = damageB;
  return [a, b];
}

describe("scoring", () => {
  it("gives the busier boxer the round ten to nine", () => {
    const [a, b] = pair([30], [12]);
    expect(scoreRound(a, b, 1)).toEqual([10, 9]);
  });

  it("scores a very close round even", () => {
    const [a, b] = pair([20], [18.5]);
    expect(scoreRound(a, b, 1)).toEqual([10, 10]);
  });

  it("takes a point for each knockdown", () => {
    const [a, b] = pair([30], [12]);
    b.roundKnockdowns = [1];
    expect(scoreRound(a, b, 1)).toEqual([10, 8]);
  });

  it("adds the rounds up for a decision, or calls a draw", () => {
    const [a, b] = pair([30, 10, 25], [10, 30, 5]);
    expect(decision(a, b, 3)).toMatchObject({ winner: 0, method: "Decision", totals: [29, 28] });
    const [c, d] = pair([30, 10], [10, 30]);
    expect(decision(c, d, 2)).toMatchObject({ winner: null, method: "Draw" });
  });
});
