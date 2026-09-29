import { describe, expect, it } from "vitest";
import { autoPicker, leadTarget, pickTarget } from "./aim";
import { bySeat, cmd, game, place, run, snapped } from "./test-kit";
import { v2 } from "./vec";

describe("assisted throwing", () => {
  it("lights up the receiver nearest the throw stick's line", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const [left, right] = s.athletes.filter((a) => a.team === 0 && a.role === "runner");
    place(qb, -30, 0);
    place(left!, -15, -8);
    place(right!, -15, 8);
    expect(pickTarget(s, qb, v2(1, 0.5))).toBe(right!.id);
    expect(pickTarget(s, qb, v2(1, -0.5))).toBe(left!.id);
    // A stick barely touched, or pointed backwards, picks nobody.
    expect(pickTarget(s, qb, v2(0.1, 0))).toBeNull();
    expect(pickTarget(s, qb, v2(-1, 0))).toBeNull();
  });

  it("leads a receiver on the run", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const r = bySeat(s, 1);
    place(qb, -30, 0);
    place(r, -10, 0, 0, 8);
    const { at, eta } = leadTarget(qb, r);
    expect(eta).toBeGreaterThan(0.5);
    expect(at.z).toBeCloseTo(8 * eta, 1);
  });

  it("completes a throw to a receiver running a straight line", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const r = bySeat(s, 1);
    place(qb, s.drive.los - 5, 0);
    place(r, s.drive.los + 8, -10, 7, 0);
    const events = [
      ...run(s, 1 / 60, new Map([[qb.id, { move: v2(), aim: v2(1, -0.6) }], [r.id, { move: v2(1, 0) }]])),
      ...run(s, 1 / 60, new Map([[qb.id, { move: v2(), throw: true }], [r.id, { move: v2(1, 0) }]])),
    ];
    expect(events.some((e) => e.type === "throw" && e.target === r.id)).toBe(true);
    expect(s.ball.mode).toBe("spiral");
    const flight = run(s, 3, cmd(r.id, { move: v2(1, 0) }));
    expect(flight.some((e) => e.type === "catch" && e.athlete === r.id)).toBe(true);
    expect(flight.some((e) => e.type === "interception")).toBe(false);
    expect(qb.stats.completions).toBe(1);
  });

  it("is picked off every time by a defender standing in front of the target", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const r = bySeat(s, 1);
    const d = s.athletes.find((a) => a.team === 1 && a.seat === null && a.role === "runner")!;
    place(qb, s.drive.los - 5, 0);
    place(r, s.drive.los + 10, 0);
    place(d, s.drive.los + 8.6, 0.3);
    run(s, 1 / 60, cmd(qb.id, { aim: v2(1, 0) }));
    const events = run(s, 2, cmd(qb.id, { throw: true }));
    const pick = events.find((e) => e.type === "interception");
    expect(pick).toMatchObject({ athlete: d.id, auto: true });
    expect(s.play.intercepted).toBe(true);
    expect(d.stats.interceptions).toBe(1);
  });

  it("never auto intercepts for a defender holding Guard", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const d = bySeat(s, 3);
    place(qb, 0, 0);
    place(d, 8.5, 0);
    expect(autoPicker(s, qb, v2(10, 0))?.id).toBe(d.id);
    d.guard.held = true;
    expect(autoPicker(s, qb, v2(10, 0))).toBeNull();
  });

  it("falls incomplete when the receiver runs away from it", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    const r = bySeat(s, 1);
    place(qb, s.drive.los - 5, 0);
    place(r, s.drive.los + 15, -12, 8, 0);
    run(s, 1 / 60, cmd(qb.id, { aim: v2(1, -0.6) }));
    run(s, 1 / 60, cmd(qb.id, { throw: true }));
    const events = run(s, 4, cmd(r.id, { move: v2(-1, 1) }));
    expect(events.some((e) => e.type === "incomplete")).toBe(true);
    expect(s.drive.down).toBe(2);
  });

  it("allows no forward pass once the quarterback crosses the line", () => {
    const s = snapped(game());
    const qb = bySeat(s, 0);
    place(qb, s.drive.los + 3, 0);
    run(s, 1 / 60, cmd(qb.id, { aim: v2(1, 0) }));
    const events = run(s, 0.1, cmd(qb.id, { throw: true }));
    expect(events.some((e) => e.type === "throw")).toBe(false);
  });
});
