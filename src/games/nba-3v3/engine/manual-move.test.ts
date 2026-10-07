import { describe, expect, it } from "vitest";
import type { BuildId } from "../builds";
import { manualBoost } from "./manual-move";
import { Match } from "./match";
import { STEP } from "./tuning";

/** Player 0 is a person, player 1 the computer, the same build side by side, nobody with the ball near them. */
function setup(build: BuildId): Match {
  const m = new Match({ seed: 1, firstOffence: 0, botLevel: "hard", entries: [{ team: 0, build, seat: 0 }, { team: 1, build, seat: null }] });
  m.checkBeat = false;
  m.phase = "live";
  m.ball.holder = null;
  Object.assign(m.athletes[0]!, { x: -6, z: 9 });
  Object.assign(m.athletes[1]!, { x: -6, z: 4, auto: false });
  return m;
}

/** Seconds from a standstill to `speed` metres a second, steering player `id` along x. */
function timeTo(m: Match, id: number, speed: number, viaStick: boolean): number {
  const a = m.athletes[id]!;
  if (viaStick) m.setMove(id, { x: 1, z: 0 });
  for (let t = 0; t < 2; t += STEP) {
    if (!viaStick) a.move = { x: 1, z: 0 };
    m.step(STEP);
    if (Math.hypot(a.vx, a.vz) >= speed) return t;
  }
  return Infinity;
}

describe("a person on the stick", () => {
  it("gets going sooner and runs faster than the same body steered for him", () => {
    const m = setup("lockdown");
    const person = timeTo(m, 0, 4, true);
    const steered = timeTo(m, 1, 4, false);
    expect(person).toBeLessThan(steered * 0.85);
    expect(Math.hypot(m.athletes[0]!.vx, m.athletes[0]!.vz)).toBeGreaterThan(Math.hypot(m.athletes[1]!.vx, m.athletes[1]!.vz));
  });

  it("is boosted most without the ball, and not at all for the computer or Guard", () => {
    const m = setup("shooter");
    const a = m.athletes[0]!;
    m.setMove(0, { x: 1, z: 0 });
    expect(manualBoost(a, false).power).toBeGreaterThan(manualBoost(a, true).power);
    expect(manualBoost(a, true).speed).toBeGreaterThan(1);
    // Guard steering with the stick let go runs on the plain body.
    m.setMove(0, { x: 0, z: 0 });
    a.move = { x: 1, z: 0 };
    expect(manualBoost(a, false).speed).toBe(1);
    m.setMove(0, { x: 1, z: 0 });
    a.auto = true;
    expect(manualBoost(a, false).speed).toBe(1);
  });
});
