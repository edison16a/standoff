import { describe, expect, it } from "vitest";
import type { CharacterId } from "../roster";
import { guardSpot, guardStatus, guardTarget } from "./guard";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";

const STARS: CharacterId[] = ["ashby", "whitlock", "crane", "varelas", "zupan", "delacroix"];
/** Team 0 has the ball; athlete 3 is a person on defence, guarding athlete 0 (both Guards). */
const ENTRIES: Entry[] = STARS.map((character, i) => ({ team: i < 3 ? 0 : 1, character, seat: i === 3 ? 1 : null, slot: i % 3 }));

function setup(): Match {
  const m = new Match({ entries: ENTRIES, seed: 5, firstOffence: 0, botLevel: "training" });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i * 2.4, z: 10.8, vx: 0, vz: 0, action: { kind: "none" } }));
  Object.assign(m.athletes[0]!, { x: 0, z: 8 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

function run(m: Match, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds; t += STEP) {
    each?.();
    m.step(STEP);
  }
}

describe("guard", () => {
  it("picks up the opponent in the same role", () => {
    const m = setup();
    expect(guardTarget(m, m.athletes[3]!)?.id).toBe(0);
  });

  it("shadows the ball handler between him and the rim when held", () => {
    const m = setup();
    const d = m.athletes[3]!;
    Object.assign(d, { x: 2, z: 7 });
    m.press(3, "shoot");
    expect(guardStatus(m, d)).toBe("on");
    run(m, 2);
    const spot = guardSpot(m, m.athletes[0]!);
    expect(Math.hypot(d.x - spot.x, d.z - spot.z)).toBeLessThan(0.35);
    m.release(3);
    expect(d.guard).toBe(false);
  });

  it("does nothing out of range", () => {
    const m = setup();
    const d = m.athletes[3]!;
    Object.assign(d, { x: -6, z: 1 });
    m.press(3, "shoot");
    expect(guardStatus(m, d)).toBe("far");
    run(m, 0.5);
    expect(Math.hypot(d.vx, d.vz)).toBeLessThan(0.05);
  });

  it("lags behind a dribble move, which the stick has to make up", () => {
    const lagAfter = (move: boolean): number => {
      const m = setup();
      const d = m.athletes[3]!;
      Object.assign(d, { x: 0, z: 7 });
      m.press(3, "shoot");
      run(m, 1);
      const h = m.athletes[0]!;
      if (move) h.action = { kind: "move", t: 0, move: "crossover", dur: 0.6, side: 1, dir: { x: 1, z: 0 }, resolved: true };
      run(m, 0.4, () => {
        h.x += 4 * STEP;
      });
      const spot = guardSpot(m, h);
      return Math.hypot(d.x - spot.x, d.z - spot.z);
    };
    expect(lagAfter(true)).toBeGreaterThan(lagAfter(false) + 0.3);
  });

  it("gives way to the stick", () => {
    const m = setup();
    const d = m.athletes[3]!;
    Object.assign(d, { x: 0, z: 7 });
    m.press(3, "shoot");
    m.setMove(3, { x: -1, z: 0 });
    run(m, 0.5);
    expect(d.vx).toBeLessThan(-1);
  });

  it("jumps with Pass and swipes with the third button on defence", () => {
    const m = setup();
    const d = m.athletes[3]!;
    Object.assign(d, { x: 0, z: 7.2 });
    m.press(3, "pass");
    expect(d.action.kind).toBe("block");
    const far = m.athletes[4]!;
    m.press(4, "defend");
    expect(far.action.kind).toBe("steal");
  });
});
