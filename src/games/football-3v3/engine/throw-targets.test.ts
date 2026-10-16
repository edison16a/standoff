import { describe, expect, it } from "vitest";
import { knockDown } from "./down";
import type { Match } from "./match";
import { acrossOf } from "./playbook/runners";
import { seatStatus } from "./status";
import { callPlay, peopleMatch, run, snap } from "./test-helpers";
import { slotsOpen, throwSlots } from "./throw-targets";

/** A computer runner of the play: one the test can stop dead or let run his route. */
function botRunner(m: Match): { id: number; slot: number } {
  const slot = m.play!.runners.findIndex((id) => m.athletes[id]!.auto);
  return { id: m.play!.runners[slot]!, slot };
}

describe("the QB's throw buttons", () => {
  it("number the play's four runners left to right, as the card and the big screen do", () => {
    const m = peopleMatch();
    snap(m);
    const qb = m.qbOf(m.offense);
    const slots = throwSlots(m, qb);
    expect(slots).toEqual(m.play!.runners);
    const across = slots.map((id) => acrossOf(m, m.athletes[id]!.z));
    expect([...across].sort((a, b) => a - b)).toEqual(across);
  });

  it("stay grey before the snap and for a runner on the turf", () => {
    const m = peopleMatch();
    const qb = m.qbOf(m.offense);
    callPlay(m, qb.id, "throw");
    expect(seatStatus(m, 0)!.throws).toEqual([false, false, false, false]);
    m.press(qb.id, "hike");
    run(m, 1, () => m.carrier() === qb);
    const { id, slot } = botRunner(m);
    knockDown(m.athletes[id]!, 2, "pancaked");
    const open = slotsOpen(m, qb);
    expect(open[slot]).toBe(false);
    expect(open.filter(Boolean)).toHaveLength(3);
  });

  it("lead a runner on the move to where he will be", () => {
    const m = peopleMatch();
    snap(m);
    run(m, 1);
    const qb = m.qbOf(m.offense);
    const { id, slot } = botRunner(m);
    const r = m.athletes[id]!;
    m.throwTo(qb.id, slot);
    run(m, 1, () => m.ball.state === "pass");
    const pass = m.ball.pass!;
    expect(pass.to).toBe(id);
    // Thrown ahead of him along his run, not at where he stood.
    const speed = Math.hypot(r.vx, r.vz);
    expect(speed).toBeGreaterThan(2);
    const ahead = ((pass.spot.x - r.x) * r.vx + (pass.spot.z - r.z) * r.vz) / speed;
    expect(ahead).toBeGreaterThan(1);
  });

  it("throw straight at a runner who stands still", () => {
    const m = peopleMatch();
    snap(m);
    const qb = m.qbOf(m.offense);
    const { id, slot } = botRunner(m);
    const r = m.athletes[id]!;
    // No route left: he stands where he is.
    r.bot.route = [];
    run(m, 0.6);
    r.vx = 0;
    r.vz = 0;
    m.throwTo(qb.id, slot);
    run(m, 1, () => m.ball.state === "pass");
    expect(m.ball.pass!.to).toBe(id);
    expect(Math.hypot(m.ball.pass!.spot.x - r.x, m.ball.pass!.spot.z - r.z)).toBeLessThan(0.6);
  });
});
