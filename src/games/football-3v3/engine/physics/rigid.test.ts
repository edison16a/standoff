import { describe, expect, it } from "vitest";
import { dot3, len3, type V3 } from "../vec";
import { BALL_SHAPE, GRAVITY, extent, longAxis, momentumOf, omegaOf, support } from "./ball-shape";
import { integrate, SUB } from "./integrate";
import { IDENTITY, qAxisAngle, qFromTo, qRotate, qSlerp, qSpin, qUnrotate, type Quat } from "./quat";
import type { TurfBody } from "./turf";

const body = (q: Quat, w: V3, vel: V3 = { x: 0, y: 0, z: 0 }): TurfBody => ({
  pos: { x: 0, y: 10, z: 0 }, vel, q, L: momentumOf(q, w),
});

const rotEnergy = (b: TurfBody) => 0.5 * dot3(b.L, omegaOf(b.q, b.L));

describe("quaternions", () => {
  it("rotate and unrotate as inverses", () => {
    const q = qAxisAngle({ x: 0.6, y: 0, z: 0.8 }, 1.1);
    const v = { x: 0.3, y: -2, z: 5 };
    const back = qUnrotate(q, qRotate(q, v));
    expect(back.x).toBeCloseTo(v.x, 10);
    expect(back.y).toBeCloseTo(v.y, 10);
    expect(back.z).toBeCloseTo(v.z, 10);
  });

  it("turn one direction onto another, even straight back", () => {
    for (const to of [{ x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0.6, y: 0.8, z: 0 }]) {
      const r = qRotate(qFromTo({ x: 0, y: 1, z: 0 }, to), { x: 0, y: 1, z: 0 });
      expect(Math.hypot(r.x - to.x, r.y - to.y, r.z - to.z)).toBeLessThan(1e-9);
    }
  });

  it("spin by an angular velocity and blend smoothly", () => {
    const q = qSpin(IDENTITY, { x: 0, y: Math.PI, z: 0 }, 0.5);
    const x = qRotate(q, { x: 1, y: 0, z: 0 });
    expect(x.z).toBeCloseTo(-1, 9);
    const mid = qSlerp(IDENTITY, q, 0.5);
    expect(qRotate(mid, { x: 1, y: 0, z: 0 }).x).toBeCloseTo(Math.SQRT1_2, 9);
  });
});

describe("the spheroid", () => {
  it("is half its length thick along the nose and its radius across", () => {
    expect(extent(IDENTITY, { x: 0, y: 1, z: 0 })).toBeCloseTo(BALL_SHAPE.half);
    expect(extent(IDENTITY, { x: 1, y: 0, z: 0 })).toBeCloseTo(BALL_SHAPE.radius);
    const tip = support(IDENTITY, { x: 0, y: -1, z: 0 });
    expect(tip.y).toBeCloseTo(-BALL_SHAPE.half);
  });

  it("finds its lowest point on the surface for any tilt", () => {
    const q = qAxisAngle({ x: 0, y: 0, z: 1 }, 0.7);
    const p = support(q, { x: 0, y: -1, z: 0 });
    const b = qUnrotate(q, p);
    // On the ellipsoid: (x/r)^2 + (y/a)^2 + (z/r)^2 = 1.
    const on = (b.x / BALL_SHAPE.radius) ** 2 + (b.y / BALL_SHAPE.half) ** 2 + (b.z / BALL_SHAPE.radius) ** 2;
    expect(on).toBeCloseTo(1, 9);
    expect(-p.y).toBeCloseTo(extent(q, { x: 0, y: -1, z: 0 }), 9);
  });
});

describe("the rigid body in a vacuum", () => {
  it("keeps its energy through a parabola", () => {
    const b = body(IDENTITY, { x: 0, y: 60, z: 2 }, { x: 15, y: 12, z: 0 });
    const total = (x: TurfBody) => 0.5 * BALL_SHAPE.mass * len3(x.vel) ** 2 + BALL_SHAPE.mass * GRAVITY * x.pos.y + rotEnergy(x);
    const e0 = total(b);
    for (let i = 0; i < 480 * 2; i++) integrate(b, SUB, { air: false });
    expect(Math.abs(total(b) - e0) / e0).toBeLessThan(0.002);
  });

  it("spins steadily about its long axis, a pure spiral staying pure", () => {
    const q = qFromTo({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 });
    const b = body(q, { x: 63, y: 0, z: 0 });
    const e0 = rotEnergy(b);
    for (let i = 0; i < 480 * 3; i++) integrate(b, SUB, { air: false, gravity: false });
    expect(longAxis(b.q).x).toBeCloseTo(1, 6);
    expect(rotEnergy(b)).toBeCloseTo(e0, 6);
  });

  it("circles its nose round its angular momentum when spun off axis (free nutation)", () => {
    const q = qFromTo({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 });
    const L = { x: BALL_SHAPE.iLong * 60, y: BALL_SHAPE.iLong * 60 * Math.tan(0.15), z: 0 };
    const b: TurfBody = { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, q, L };
    const e0 = rotEnergy(b);
    const cone: number[] = [];
    for (let i = 0; i < 480; i++) {
      integrate(b, SUB, { air: false, gravity: false });
      const a = longAxis(b.q);
      cone.push(Math.acos(dot3(a, L) / len3(L)));
    }
    // The axis keeps the same angle to L (a steady cone) and the energy holds.
    expect(Math.max(...cone) - Math.min(...cone)).toBeLessThan(0.01);
    expect(cone[0]).toBeCloseTo(0.15, 1);
    expect(Math.abs(rotEnergy(b) - e0) / e0).toBeLessThan(1e-4);
  });

  it("tumbles end over end steadily about its broad axis", () => {
    const b = body(IDENTITY, { x: 0, y: 0, z: 14 });
    const start = longAxis(b.q);
    for (let i = 0; i < Math.round((Math.PI / 14) * 480); i++) integrate(b, SUB, { air: false, gravity: false });
    // Half a turn later the nose points the other way.
    expect(dot3(start, longAxis(b.q))).toBeLessThan(-0.99);
  });
});
