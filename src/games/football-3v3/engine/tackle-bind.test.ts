import { describe, expect, it } from "vitest";
import { tackle } from "./tackle";
import { holdAt, leftOf, slideAt } from "./tackle-bind";
import { TACKLE_MOVES } from "./tackle-moves";
import { TACKLE_KINDS, type TackleKind } from "./tackle-preset";
import { bySeat, peopleMatch, run, snap } from "./test-helpers";
import { STEP } from "./tuning";
import type { Athlete } from "./types";
import { dist2, dot2, fromYaw } from "./vec";

/** A live play with the QB running up the field and a defender meeting him at `gap`, from `angle` off his run. */
function meet(angle: number, gap = 1.1) {
  const m = peopleMatch();
  snap(m);
  const qb = bySeat(m, 0);
  const d = bySeat(m, 3);
  const helper = bySeat(m, 2);
  helper.x = qb.x + 30;
  qb.vx = m.sign * 6;
  qb.vz = 0;
  const run = Math.atan2(qb.vx, qb.vz);
  const from = fromYaw(run + angle);
  d.x = qb.x + from.x * gap;
  d.z = qb.z + from.z * gap;
  d.vx = -from.x * 5;
  d.vz = -from.z * 5;
  return { m, qb, d, helper };
}

const bindOf = (a: Athlete) => (a.action.kind === "down" ? a.action.bind : null);

describe("holding the men of a tackle together", () => {
  it("eases from where they met into the preset's places", () => {
    const keys = TACKLE_MOVES.wrap.hold;
    const from = { along: -1, across: 1 };
    expect(holdAt(keys, from, 0)).toEqual(from);
    expect(holdAt(keys, from, keys[0]!.t).along).toBeCloseTo(keys[0]!.along);
    expect(holdAt(keys, from, 99).across).toBeCloseTo(keys[keys.length - 1]!.across);
  });

  it("reads the slide by the clock", () => {
    expect(slideAt(TACKLE_MOVES.drive.slide, 0.2).push).toBeGreaterThan(0);
    expect(slideAt(TACKLE_MOVES.drive.slide, 5).decel).toBeGreaterThan(0);
  });

  it("binds carrier and tackler to each other and puts both down for the preset's time", () => {
    for (const kind of TACKLE_KINDS) {
      const { m, qb, d } = meet(0.4);
      tackle(m, qb, d, kind, { x: m.sign, z: 0 });
      expect(bindOf(qb)).toMatchObject({ kind, role: "carrier", partner: d.id });
      expect(bindOf(d)).toMatchObject({ kind, role: "tackler", partner: qb.id });
      expect(qb.action).toMatchObject({ dur: TACKLE_MOVES[kind].carrierDown, cause: "tackled" });
      expect(d.action).toMatchObject({ dur: TACKLE_MOVES[kind].tacklerDown, cause: "tackler" });
    }
  });

  it("keeps the tackler on the carrier through the fall, at the preset's place and never inside him", () => {
    for (const kind of TACKLE_KINDS) {
      const { m, qb, d } = meet(1.2);
      tackle(m, qb, d, kind, { x: Math.sin(-1.2) * m.sign, z: Math.cos(-1.2) });
      const release = TACKLE_MOVES[kind].release;
      for (let t = 0; t < release - STEP; t += STEP) {
        run(m, STEP);
        const b = bindOf(d)!;
        if (d.action.kind !== "down" || d.action.t < 0.2 || d.action.t >= release) continue;
        const at = holdAt(TACKLE_MOVES[kind].hold, b.from, d.action.t);
        const off = { x: d.x - qb.x, z: d.z - qb.z };
        expect(dot2(off, b.f)).toBeCloseTo(at.along, 1);
        expect(dot2(off, leftOf(b.f)) * b.side).toBeCloseTo(at.across, 1);
      }
    }
  });

  it("drives a man back along the hit on a head on tackle", () => {
    const { m, qb, d } = meet(0);
    qb.vx = m.sign * 1;
    const startX = qb.x;
    tackle(m, qb, d, "drive", { x: m.sign, z: 0 });
    run(m, 0.5);
    expect((qb.x - startX) * m.sign).toBeGreaterThan(0.4);
    // He faces the man who hit him and goes down on his back.
    expect(Math.cos(qb.yaw - Math.atan2(d.x - qb.x, d.z - qb.z))).toBeGreaterThan(0.9);
  });

  it("lets a shoestring tackler go so the carrier stumbles on ahead of him", () => {
    const { m, qb, d } = meet(Math.PI, 1.2);
    tackle(m, qb, d, "shoestring", { x: m.sign, z: 0 });
    run(m, 0.8);
    expect(dist2(qb, d)).toBeGreaterThan(2);
  });

  it("piles a helper onto the carrier in a gang tackle", () => {
    const { m, qb, d, helper } = meet(0.8);
    helper.x = qb.x - 0.6;
    helper.z = qb.z + 0.8;
    tackle(m, qb, d, "gang", { x: m.sign, z: 0 }, [helper]);
    expect(bindOf(helper)).toMatchObject({ kind: "gang", role: "pile", partner: qb.id });
    expect(helper.action).toMatchObject({ cause: "pile" });
    run(m, 0.7);
    expect(dist2(helper, qb)).toBeLessThan(0.7);
  });

  it("leaves a carrier hit in his dive down on his chest, facing the way he dove", () => {
    const { m, qb, d } = meet(0.4);
    qb.action = { kind: "dive", t: 0.4, dur: 0.7, dir: { x: m.sign, z: 0 } };
    const yaw = qb.yaw;
    tackle(m, qb, d, "drive", { x: m.sign, z: 0 });
    expect(bindOf(qb)).toMatchObject({ role: "carrier", prone: true });
    expect(qb.yaw).toBe(yaw);
    const { qb: up, d: d2 } = meet(0.4);
    tackle(m, up, d2, "wrap", { x: m.sign, z: 0 });
    expect(bindOf(up)?.prone).toBeUndefined();
  });

  it("gets everyone up in time for the next play", () => {
    const longest = Math.max(...TACKLE_KINDS.map((k: TackleKind) => TACKLE_MOVES[k].carrierDown));
    expect(longest).toBeLessThan(2.2);
  });
});
