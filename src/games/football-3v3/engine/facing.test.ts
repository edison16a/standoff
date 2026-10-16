import { describe, expect, it } from "vitest";
import { attackSign } from "../teams";
import type { Entry } from "./lineup";
import { Match } from "./match";
import { LATCH } from "./stick-latch";
import { callPlay, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import { angleDiff } from "./vec";

/** One person at QB, computer runners everywhere else. */
const ALONE: Entry[] = [
  { team: 0, role: "qb", build: "gunslinger", seat: 0 },
  { team: 0, role: "runner", build: "speedster", seat: null },
  { team: 0, role: "runner", build: "routerunner", seat: null },
  { team: 1, role: "qb", build: "scrambler", seat: null },
  { team: 1, role: "runner", build: "lockdown", seat: null },
  { team: 1, role: "runner", build: "powerback", seat: null },
];

const upfieldYaw = (team: 0 | 1) => (attackSign(team) > 0 ? Math.PI / 2 : -Math.PI / 2);

describe("facing the right way", () => {
  it("keeps every man in his stance facing downfield until the snap", () => {
    const m = new Match({ entries: ALONE, seed: 3, firstOffense: 0, level: "training" });
    const qb = m.bySeat(0)!;
    callPlay(m, qb.id, "throw");
    run(m, 1.5);
    for (const a of m.athletes.filter((x) => x.team === m.offense)) {
      expect(Math.abs(angleDiff(a.yaw, upfieldYaw(a.team)))).toBeLessThan(0.05);
    }
  });

  it("does not send the receiver back the wrong way on the passer's held stick", () => {
    const m = new Match({ entries: ALONE, seed: 3, firstOffense: 0, level: "training" });
    snap(m);
    const qb = m.bySeat(0)!;
    // The thumb pulls the QB back into his drop and is still held as the ball goes.
    const back = { x: -m.sign, z: 0 };
    m.setMove(qb.id, back);
    run(m, 0.5);
    const slot = m.play!.runners.findIndex((id) => m.athletes[id]!.auto);
    const wr = m.athletes[m.play!.runners[slot]!]!;
    m.throwTo(qb.id, slot);
    run(m, 1, () => m.ball.state === "pass");
    expect(m.steered(0)).toBe(wr);
    expect(wr.latch).not.toBeNull();
    // The same stick reading keeps coming from the phone: he still plays the ball and turns upfield with it.
    for (let t = 0; t < 4 && m.phase === "live"; t += STEP) {
      m.setMove(wr.id, back);
      m.step(STEP);
      if (m.carrier() === wr) break;
    }
    expect(m.carrier()).toBe(wr);
    // Caught on his feet, not lunging back for a ball he ran away from.
    expect(wr.action.kind).toBe("none");
    for (let t = 0; t < 1; t += STEP) {
      m.setMove(wr.id, back);
      m.step(STEP);
    }
    expect(m.phase).toBe("live");
    expect(wr.vx * m.sign).toBeGreaterThan(3);
    expect(Math.abs(angleDiff(wr.yaw, upfieldYaw(wr.team)))).toBeLessThan(Math.PI / 2);
  });

  it("hands the receiver back to the thumb once it moves", () => {
    const m = new Match({ entries: ALONE, seed: 3, firstOffense: 0, level: "training" });
    snap(m);
    const qb = m.bySeat(0)!;
    m.setMove(qb.id, { x: -m.sign, z: 0 });
    run(m, 0.4);
    const slot = m.play!.runners.findIndex((id) => m.athletes[id]!.auto);
    const wr = m.athletes[m.play!.runners[slot]!]!;
    m.throwTo(qb.id, slot);
    run(m, 1, () => m.ball.state === "pass");
    expect(wr.latch).not.toBeNull();
    // A small wobble keeps the latch; a real push or letting go ends it.
    m.setMove(wr.id, { x: -m.sign, z: LATCH.moved * 0.5 });
    expect(wr.latch).not.toBeNull();
    m.setMove(wr.id, { x: 0, z: 1 });
    expect(wr.latch).toBeNull();
  });

  it("needs no latch when the thumb was off the stick at the throw", () => {
    const m = new Match({ entries: ALONE, seed: 3, firstOffense: 0, level: "training" });
    snap(m);
    const qb = m.bySeat(0)!;
    m.setMove(qb.id, { x: 0, z: 0 });
    const slot = m.play!.runners.findIndex((id) => m.athletes[id]!.auto);
    const wr = m.athletes[m.play!.runners[slot]!]!;
    m.throwTo(qb.id, slot);
    run(m, 1, () => m.ball.state === "pass");
    expect(m.steered(0)).toBe(wr);
    expect(wr.latch).toBeNull();
  });
});
