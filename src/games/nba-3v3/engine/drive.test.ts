import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { Match, type Entry } from "./match";
import { BOARD, STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : null }));

/** A live match with the first player holding the ball at a spot, everyone else far off. */
function ballAt(x: number, z: number): Match {
  const m = new Match({ entries: ENTRIES, seed: 3, firstOffence: 0 });
  while (m.phase !== "live") m.step(STEP);
  m.athletes.forEach((a, i) => {
    a.x = i === 0 ? x : -6 + i * 0.5;
    a.z = i === 0 ? z : 10.5;
    a.vx = a.vz = 0;
  });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

describe("shooting from under the glass", () => {
  it("turns into a layup that finishes in front of the backboard", () => {
    const m = ballAt(1.6, 0.7);
    m.press(0, "shoot");
    const act = m.athletes[0]!.action;
    expect(act.kind).toBe("drive");
    if (act.kind === "drive") expect(act.to.z).toBeGreaterThan(BOARD.face + 0.2);
  });

  it("keeps the ball in front of the glass all the way up", () => {
    const m = ballAt(-1.2, 0.8);
    m.press(0, "shoot");
    let behind = false;
    for (let t = 0; t < 2.5; t += STEP) {
      m.step(STEP);
      const b = m.ball.pos;
      if (b.y > BOARD.bottom && b.y < BOARD.top && Math.abs(b.x) < BOARD.halfWidth && b.z < BOARD.face) behind = true;
    }
    expect(behind).toBe(false);
  });
});
