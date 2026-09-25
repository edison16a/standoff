import { describe, expect, it } from "vitest";
import type { CharacterId } from "../../roster";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";
import { jumperValue } from "./shot-value";

function lineup(chars: CharacterId[]): Entry[] {
  return chars.map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: null }));
}

/** Puts one player alone at the top of the key and everyone else far away. */
function aloneAtTop(m: Match, id: number): void {
  m.athletes.forEach((a, i) => {
    a.x = i === id ? 0 : -6 + i;
    a.z = i === id ? 9 : 10.5;
  });
}

describe("computer players", () => {
  it("value an open three from a great shooter above one from a poor shooter", () => {
    const m = new Match({ entries: lineup(["curry", "lebron", "giannis", "durant", "jokic", "doncic"]), seed: 1 });
    aloneAtTop(m, 0);
    const curry = jumperValue(m, m.athletes[0]!);
    aloneAtTop(m, 2);
    const giannis = jumperValue(m, m.athletes[2]!);
    expect(curry).toBeGreaterThan(giannis);
  });

  it("value a three less with a defender in the shooter's face", () => {
    const m = new Match({ entries: lineup(["curry", "lebron", "giannis", "durant", "jokic", "doncic"]), seed: 1 });
    aloneAtTop(m, 0);
    const open = jumperValue(m, m.athletes[0]!);
    const guard = m.athletes[1]!;
    guard.x = 0;
    guard.z = 8;
    expect(jumperValue(m, m.athletes[0]!)).toBeLessThan(open);
  });

  it("get the great shooters their shots over a few games", () => {
    let curryThrees = 0;
    let passes = 0;
    let intercepts = 0;
    for (const seed of [1, 2, 3]) {
      const m = new Match({ entries: lineup(["curry", "lebron", "durant", "giannis", "jokic", "doncic"]), seed });
      for (let t = 0; t < 900 && m.phase !== "over"; t += STEP) {
        m.step(STEP);
        for (const e of m.drainEvents()) {
          if (e.type === "shot" && e.id === 0 && e.three) curryThrees++;
          if (e.type === "pass") passes++;
          if (e.type === "intercept") intercepts++;
        }
      }
    }
    expect(curryThrees).toBeGreaterThanOrEqual(3);
    // Passing lanes are a risk, not a coin flip.
    expect(intercepts / passes).toBeLessThan(0.12);
    // Three whole games take a few seconds, longer on a busy machine.
  }, 60000);

  it("use every kind of dribble move and never reach in past the risky third try", () => {
    const moves = new Set<string>();
    let shakes = 0;
    let most = 0;
    for (const seed of [1, 2, 3]) {
      const m = new Match({ entries: lineup(["curry", "lebron", "durant", "giannis", "jokic", "doncic"]), seed });
      for (let t = 0; t < 900 && m.phase !== "over"; t += STEP) {
        m.step(STEP);
        for (const e of m.drainEvents()) {
          if (e.type === "move") moves.add(e.move);
          if (e.type === "shake") shakes++;
        }
        for (const d of m.athletes) for (const h of m.athletes) if (d.team !== h.team) most = Math.max(most, m.stealLog.count(d.id, h.id));
      }
    }
    expect([...moves].sort()).toEqual(["behindBack", "crossover", "hesitation", "spin", "stepback"]);
    expect(shakes).toBeGreaterThan(3);
    expect(most).toBeLessThanOrEqual(3);
  }, 60000);
});
