import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../roster";
import { updateDribbleHand } from "./dribble";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";

const ENTRIES: Entry[] = CHARACTER_IDS.slice(0, 6).map((character, i) => ({ team: (i % 2) as 0 | 1, character, seat: i === 0 ? 1 : null }));

/** Player 0 dribbling at the top facing the rim, with one defender at a chosen side and the rest far off. */
function setup(defenderX: number): Match {
  const m = new Match({ entries: ENTRIES, seed: 2, firstOffence: 0 });
  m.athletes.forEach((a, i) => Object.assign(a, { x: -6 + i, z: 10.5, vx: 0, vz: 0 }));
  Object.assign(m.athletes[0]!, { x: 0, z: 7, yaw: Math.PI, dribbleHand: 1, dribbleSide: 1, dribble: 0.05 });
  // Facing the rim, the player's right is toward positive x, as the camera sees it.
  Object.assign(m.athletes[1]!, { x: defenderX, z: 6.2 });
  m.ball.holder = 0;
  m.ball.mode = "held";
  return m;
}

describe("the dribble", () => {
  it("crosses over to the hand away from the defender, through the middle", () => {
    const m = setup(0.6);
    const a = m.athletes[0]!;
    let middle = false;
    for (let t = 0; t < 1; t += STEP) {
      updateDribbleHand(m, a, STEP);
      if (Math.abs(a.dribbleSide) < 0.2) middle = true;
    }
    expect(a.dribbleHand).toBe(-1);
    expect(a.dribbleSide).toBe(-1);
    expect(middle).toBe(true);
  });

  it("keeps the ball in the hand already away from the defender", () => {
    const m = setup(-0.6);
    const a = m.athletes[0]!;
    for (let t = 0; t < 1; t += STEP) updateDribbleHand(m, a, STEP);
    expect(a.dribbleHand).toBe(1);
  });
});
