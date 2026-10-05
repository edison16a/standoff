import { describe, expect, it } from "vitest";
import { POSTS } from "../field";
import { Rng } from "../rng";
import { dot3, len3, type V3 } from "../vec";
import { BALL_SHAPE, GRAVITY, momentumOf, omegaOf, support } from "./ball-shape";
import { integrate, SUB } from "./integrate";
import { touchGoal } from "./posts";
import { IDENTITY, qAxisAngle, type Quat } from "./quat";
import { touchTurf, TURF, type TurfBody } from "./turf";

const flat = qAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);

function drop(q: Quat, height: number, vel: V3 = { x: 0, y: 0, z: 0 }, w: V3 = { x: 0, y: 0, z: 0 }): TurfBody {
  return { pos: { x: 0, y: height, z: 0 }, vel: { ...vel }, q, L: momentumOf(q, w) };
}

const energy = (b: TurfBody) => 0.5 * BALL_SHAPE.mass * len3(b.vel) ** 2 + BALL_SHAPE.mass * GRAVITY * b.pos.y + 0.5 * dot3(b.L, omegaOf(b.q, b.L));

/** Steps with the turf for `seconds`, calling back after every sub step. */
function run(b: TurfBody, seconds: number, each?: (b: TurfBody, j: number) => void): void {
  for (let i = 0; i < Math.round(seconds / SUB); i++) {
    integrate(b, SUB, { air: false });
    const j = touchTurf(b, SUB);
    each?.(b, j);
  }
}

/** The highest the centre gets after the first bounce. */
function rebound(b: TurfBody): number {
  let bounced = false;
  let top = 0;
  run(b, 1.6, (x, j) => {
    if (j > 0.2) bounced = true;
    if (bounced) top = Math.max(top, x.pos.y);
  });
  return top;
}

describe("bounces off the turf", () => {
  it("rebounds a ball dropped flat to about e squared of the drop", () => {
    const top = rebound(drop(flat, 1 + BALL_SHAPE.radius));
    const expected = TURF.restitution ** 2 * 1 + BALL_SHAPE.radius;
    expect(top).toBeGreaterThan(expected * 0.85);
    expect(top).toBeLessThan(expected * 1.1);
  });

  it("rebounds straight up off its nose the same way, the contact under the centre", () => {
    const b = drop(IDENTITY, 1 + BALL_SHAPE.half);
    const top = rebound(b);
    expect(top - BALL_SHAPE.half).toBeGreaterThan(TURF.restitution ** 2 * 0.85);
    expect(Math.hypot(b.vel.x, b.vel.z)).toBeLessThan(0.05);
  });

  it("kicks off sideways and spinning when it lands on a slant", () => {
    const b = drop(qAxisAngle({ x: 0, y: 0, z: 1 }, 0.6), 1.2);
    let after: V3 | null = null;
    run(b, 0.6, (x, j) => {
      if (j > 0.2 && !after) after = { ...x.vel };
    });
    expect(after).not.toBeNull();
    // Some of the fall turned into sideways speed and spin: not a straight rebound.
    expect(Math.abs(after!.x)).toBeGreaterThan(0.4);
    expect(len3(b.L)).toBeGreaterThan(0.005);
  });

  it("goes a different way for each small change of tilt, as a real football does", () => {
    const sideways = [0.3, 0.45, 0.6, 0.75, 0.9].map((tilt) => {
      const b = drop(qAxisAngle({ x: 0, y: 0, z: 1 }, tilt), 1.5, { x: 6, y: 0, z: 0 });
      run(b, 0.9);
      return b.vel.x;
    });
    const spread = Math.max(...sideways) - Math.min(...sideways);
    expect(spread).toBeGreaterThan(1);
  });

  it("never gains energy from a bounce", () => {
    const rng = new Rng(4);
    for (let n = 0; n < 30; n++) {
      const q = qAxisAngle({ x: rng.range(-1, 1), y: rng.range(-1, 1), z: rng.range(-1, 1) }, rng.range(0, 3));
      const len = Math.hypot(q.x, q.y, q.z, q.w);
      const b = drop({ x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len }, 1.5, { x: rng.range(-8, 8), y: rng.range(-6, 2), z: rng.range(-8, 8) }, { x: rng.range(-30, 30), y: rng.range(-30, 30), z: rng.range(-30, 30) });
      let last = energy(b);
      run(b, 2, (x, j) => {
        if (j > 0) {
          const e = energy(x);
          // The push out of the turf can add a hair of height; never more.
          expect(e).toBeLessThan(last + 0.01);
          last = e;
        } else last = energy(x);
      });
    }
  });

  it("settles and lies still on the turf", () => {
    const b = drop(qAxisAngle({ x: 1, y: 0, z: 0 }, 0.4), 2, { x: 9, y: -3, z: 2 }, { x: 0, y: 40, z: 0 });
    run(b, 6);
    expect(len3(b.vel)).toBeLessThan(0.05);
    expect(len3(omegaOf(b.q, b.L))).toBeLessThan(0.3);
    expect(b.pos.y + support(b.q, { x: 0, y: -1, z: 0 }).y).toBeGreaterThan(-0.002);
  });

  it("skids, then rolls, then stops, on a low skimming landing", () => {
    const b = drop(flat, BALL_SHAPE.radius + 0.01, { x: 0, y: 0, z: 10 });
    run(b, 0.25);
    expect(b.vel.z).toBeLessThan(9);
    expect(len3(b.L)).toBeGreaterThan(0.002);
    run(b, 5);
    expect(len3(b.vel)).toBeLessThan(0.1);
  });

  it("never sinks into the turf or turns into NaN over long random runs", () => {
    const rng = new Rng(9);
    for (let n = 0; n < 12; n++) {
      const b = drop(qAxisAngle({ x: 0, y: 0, z: 1 }, rng.range(0, 3)), rng.range(0.5, 25), { x: rng.range(-30, 30), y: rng.range(-25, 25), z: rng.range(-30, 30) }, { x: rng.range(-60, 60), y: rng.range(-60, 60), z: rng.range(-60, 60) });
      run(b, 10, (x) => {
        expect(Number.isFinite(x.pos.x + x.pos.y + x.pos.z + x.L.x + x.L.y + x.L.z)).toBe(true);
        expect(x.pos.y + support(x.q, { x: 0, y: -1, z: 0 }).y).toBeGreaterThan(-0.01);
      });
    }
  });
});

describe("the goal posts and the net", () => {
  function shoot(pos: V3, vel: V3, seconds = 1.2): { b: TurfBody; parts: string[] } {
    const b: TurfBody = { pos: { ...pos }, vel: { ...vel }, q: qAxisAngle({ x: 0, y: 0, z: 1 }, 0.3), L: momentumOf(IDENTITY, { x: 0, y: 0, z: 12 }) };
    const parts: string[] = [];
    for (let i = 0; i < Math.round(seconds / SUB); i++) {
      integrate(b, SUB, { air: false });
      touchTurf(b, SUB);
      const hit = touchGoal(b);
      if (hit) parts.push(hit.part);
    }
    return { b, parts };
  }

  it("bounces a ball off an upright: a doink", () => {
    const { b, parts } = shoot({ x: POSTS.x - 6, y: 6, z: POSTS.halfGap }, { x: 20, y: 0.5, z: 0 }, 0.5);
    expect(parts[0]).toBe("upright");
    expect(b.vel.x).toBeLessThan(0);
  });

  it("lets a straight kick through the middle untouched", () => {
    const { parts } = shoot({ x: POSTS.x - 6, y: 6, z: 0 }, { x: 20, y: 1, z: 0 }, 0.35);
    expect(parts).toEqual([]);
  });

  it("pops a ball that clips the top of the crossbar up and over", () => {
    const { b, parts } = shoot({ x: POSTS.x - 3, y: POSTS.crossbar + 0.06, z: 0.5 }, { x: 15, y: 1.3, z: 0 }, 0.3);
    expect(parts[0]).toBe("crossbar");
    expect(b.pos.x).toBeGreaterThan(POSTS.x);
  });

  it("swallows a kick in the net behind the posts", () => {
    const { b, parts } = shoot({ x: POSTS.x - 2, y: 7, z: 1 }, { x: 22, y: 2, z: 0 }, 1.5);
    expect(parts).toContain("net");
    expect(Math.abs(b.vel.x)).toBeLessThan(2.5);
    expect(b.pos.x).toBeLessThan(POSTS.x + 4.2);
  });
});
