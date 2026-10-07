import { describe, expect, it } from "vitest";
import { Match } from "./match";
import { BOTS, bySeat, peopleMatch, run, snap } from "./test-helpers";
import { THROW_KINDS, THROW_MOVES, THROW_PICK, throwKindFor, type ThrowKind } from "./throw-preset";
import { STEP } from "./tuning";
import { angleDiff, yawOf } from "./vec";

/** Throws from a standing QB to a receiver `dx` metres downfield and `dz` across, the QB moving at `speed`. */
function throwFrom(dx: number, dz: number, speed = 0, rusher: number | null = null) {
  const m = peopleMatch();
  snap(m);
  const qb = bySeat(m, 0);
  const wr = bySeat(m, 1);
  wr.x = qb.x + dx * m.sign;
  wr.z = qb.z + dz;
  qb.vx = speed * m.sign;
  qb.vz = 0;
  if (speed > 0) m.setMove(qb.id, { x: m.sign, z: 0 });
  if (rusher !== null) {
    const d = bySeat(m, 3);
    d.x = qb.x + rusher * m.sign;
    d.z = qb.z;
  }
  m.setAim(qb.id, { x: wr.x - qb.x, z: wr.z - qb.z });
  m.setAim(qb.id, null);
  return { m, qb, wr };
}

describe("throw presets", () => {
  it("picks the motion from the distance, the QB's speed and the rush", () => {
    expect(throwKindFor(8, 0, 0)).toBe("flick");
    expect(throwKindFor(THROW_PICK.deep + 5, 0, 0)).toBe("bomb");
    expect(throwKindFor(8, THROW_PICK.moving + 1, 0)).toBe("run");
    expect(throwKindFor(THROW_PICK.deep + 5, THROW_PICK.moving + 1, 0.8)).toBe("pressure");
  });

  it("times every motion with the release inside it and the follow through after it", () => {
    for (const k of THROW_KINDS) {
      const move = THROW_MOVES[k];
      expect(move.release).toBeGreaterThan(0.1);
      expect(move.dur - move.release).toBeGreaterThan(0.2);
    }
    // A bomb winds up longest; a throw with a rusher in his face gets it out quickest.
    expect(THROW_MOVES.bomb.release).toBe(Math.max(...THROW_KINDS.map((k) => THROW_MOVES[k].release)));
    expect(THROW_MOVES.pressure.release).toBe(Math.min(...THROW_KINDS.map((k) => THROW_MOVES[k].release)));
  });

  const cases: [ThrowKind, ReturnType<typeof throwFrom>][] = [];
  it("plays the picked motion and lets the ball go on its release frame, out of the throwing hand", () => {
    cases.push(["flick", throwFrom(9, 3)], ["bomb", throwFrom(30, 4)], ["run", throwFrom(10, 4, 5)], ["pressure", throwFrom(12, 2, 0, 1.2)]);
    for (const [kind, { m, qb }] of cases) {
      const act = qb.action;
      expect(act.kind === "throw" && act.style).toBe(kind);
      const release = THROW_MOVES[kind].release;
      let at = -1;
      for (let t = 0; t < 1 && at < 0; t += STEP) {
        m.step(STEP);
        if (m.ball.state === "pass") at = (qb.action.kind === "throw" ? qb.action.t : -1);
      }
      expect(at).toBeGreaterThanOrEqual(release - 1e-9);
      expect(at).toBeLessThan(release + STEP * 1.5);
      // Out of the right hand, at the motion's own height.
      expect(m.ball.pass!.release.y).toBeCloseTo(THROW_MOVES[kind].height, 1);
    }
  });

  it("plants the feet for a set throw and keeps the legs going for one on the run", () => {
    const set = throwFrom(10, 0, 5);
    const qb = set.qb;
    // A quick flick off a man who had all but stopped: his feet set.
    qb.vx = 1.5 * set.m.sign;
    const moving = throwFrom(10, 4, 5);
    run(set.m, 0.15);
    run(moving.m, 0.15);
    expect(Math.hypot(moving.qb.vx, moving.qb.vz)).toBeGreaterThan(Math.hypot(qb.vx, qb.vz));
    expect(Math.hypot(moving.qb.vx, moving.qb.vz)).toBeGreaterThan(3);
  });

  it("is square to the target when the ball goes, even for a receiver behind him", () => {
    const { m, qb, wr } = throwFrom(-5, 7);
    run(m, 0.6, () => m.ball.state === "pass");
    expect(m.ball.state).toBe("pass");
    expect(Math.abs(angleDiff(qb.yaw, yawOf(wr.x - qb.x, wr.z - qb.z)))).toBeLessThanOrEqual(0.36);
  });

  it("throws every computer pass of a game with its body toward the ball's line", () => {
    const m = new Match({ entries: BOTS, seed: 11, level: "hard", firstOffense: 0 });
    const seen = new Set<ThrowKind>();
    let throws = 0;
    for (let t = 0; t < 900 && throws < 14; t += STEP) {
      m.step(STEP);
      for (const e of m.drainEvents()) {
        if (e.type !== "throw") continue;
        throws++;
        const qb = m.athlete(e.id)!;
        if (qb.action.kind === "throw") seen.add(qb.action.style);
        const f = m.ball.flight!;
        expect(Math.abs(angleDiff(qb.yaw, yawOf(f.vel.x, f.vel.z)))).toBeLessThan(0.6);
      }
    }
    expect(throws).toBeGreaterThan(3);
    expect(seen.size).toBeGreaterThan(1);
  });
});
