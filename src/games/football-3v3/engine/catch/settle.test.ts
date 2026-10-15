import { describe, expect, it } from "vitest";
import type { CatchKind, CatchPlan } from "../catch-preset";
import { FIELD } from "../field";
import { bySeat, peopleMatch, snap } from "../test-helpers";
import { SETTLE, settleCatch, settleStep } from "./settle";

const plan = (kind: CatchKind, more: Partial<CatchPlan> = {}): CatchPlan => ({
  kind, t: 0, at: 0.4, side: 1, height: 1.3, spot: { x: 0, z: 0 }, result: null, since: 0, contest: null, turn: 0, ...more,
});

describe("settling a catch", () => {
  it("stops a whip dead and turns him upfield, leaving the swing from facing the throw for the drawing", () => {
    const m = peopleMatch();
    snap(m);
    const wr = bySeat(m, 1);
    const back = m.sign > 0 ? -Math.PI / 2 : Math.PI / 2;
    Object.assign(wr, { yaw: back, vx: 1, vz: 0.5 });
    const p = plan("whip", { result: "held" });
    settleCatch(wr, p);
    expect(wr.yaw).toBeCloseTo(-back);
    expect(Math.hypot(wr.vx, wr.vz)).toBe(0);
    expect(Math.abs(p.turn)).toBeCloseTo(Math.PI);
  });

  it("keeps a toe tap's feet in bounds until the ball is his", () => {
    const m = peopleMatch();
    snap(m);
    const wr = bySeat(m, 1);
    Object.assign(wr, { z: FIELD.halfWidth + 0.3, vz: 3 });
    settleStep(m, wr, plan("toetap"), 1 / 120);
    expect(wr.z).toBeLessThanOrEqual(FIELD.halfWidth - SETTLE.toeIn + 1e-9);
    expect(wr.vz).toBe(0);
    // Once it is caught and he has his feet down, he may run where he likes.
    Object.assign(wr, { z: FIELD.halfWidth + 0.3, vz: 3 });
    settleStep(m, wr, plan("toetap", { result: "held", since: SETTLE.toeAfter + 0.1 }), 1 / 120);
    expect(wr.z).toBeGreaterThan(FIELD.halfWidth);
  });

  it("puts a one handed catcher on the turf as he lands, which ends the play if the ball is his", () => {
    const m = peopleMatch();
    snap(m);
    const wr = bySeat(m, 1);
    const p = plan("onehand", { result: "held", since: SETTLE.fall });
    settleStep(m, wr, p, 1 / 120);
    expect(wr.action).toMatchObject({ kind: "down", cause: "dive" });
    // Not before he lands.
    const other = bySeat(m, 3);
    settleStep(m, other, plan("onehand", { result: "held", since: SETTLE.fall - 0.1 }), 1 / 120);
    expect(other.action.kind).toBe("none");
  });
});
