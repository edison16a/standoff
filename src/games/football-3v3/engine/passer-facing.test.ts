import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { BOTS, bySeat, peopleMatch, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import { angleDiff, yawOf } from "./vec";

/** How far, in radians, the body faces from the ball's way across the ground. */
function offFlight(m: Match, qbId: number): number {
  const f = m.ball.flight!;
  return Math.abs(angleDiff(m.athlete(qbId)!.yaw, yawOf(f.vel.x, f.vel.z)));
}

describe("the QB faces his throw", () => {
  it("turns to the receiver while he backpedals and throws, never away from it", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    // Run the receiver downfield and drop the QB straight back.
    m.setMove(wr.id, { x: 1, z: 0 });
    m.setMove(qb.id, { x: -1, z: 0 });
    run(m, 1.2);
    // Backpedalling with the ball he keeps his eyes downfield.
    expect(Math.abs(angleDiff(qb.yaw, yawOf(1, 0)))).toBeLessThan(0.3);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    m.step(STEP);
    m.setAim(qb.id, null);
    // Still drifting back through the whole motion.
    let checked = false;
    for (let i = 0; i < 40 && !checked; i++) {
      m.step(STEP);
      if (m.ball.state === "pass" && m.ball.pass?.from === qb.id) {
        expect(offFlight(m, qb.id)).toBeLessThan(0.45);
        checked = true;
      }
    }
    expect(checked).toBe(true);
    // And through the follow through.
    run(m, 0.2);
    expect(offFlight(m, qb.id)).toBeLessThan(0.5);
  });

  it("faces a receiver out to the side or behind him when he throws there", () => {
    const m = peopleMatch();
    snap(m);
    const qb = bySeat(m, 0);
    const wr = bySeat(m, 1);
    // The receiver drifts back behind the QB's shoulder for a swing pass.
    wr.x = qb.x - 4;
    wr.z = qb.z + 6;
    m.setMove(qb.id, { x: -1, z: 0 });
    run(m, 0.5);
    m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
    m.setAim(qb.id, null);
    run(m, 0.3, () => m.ball.state === "pass");
    expect(m.ball.state).toBe("pass");
    expect(offFlight(m, qb.id)).toBeLessThan(0.6);
  });

  it("faces every computer throw in a full game", () => {
    const m = new Match({ entries: BOTS, seed: 11, level: "hard", firstOffense: 0 });
    let throws = 0;
    let worst = 0;
    for (let t = 0; t < 400 && throws < 12; t += STEP) {
      m.step(STEP);
      for (const e of m.drainEvents()) {
        if (e.type !== "throw") continue;
        throws++;
        worst = Math.max(worst, offFlight(m, e.id));
      }
    }
    expect(throws).toBeGreaterThan(3);
    expect(worst).toBeLessThan(0.6);
  });
});
