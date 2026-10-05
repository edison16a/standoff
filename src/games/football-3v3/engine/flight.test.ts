import { describe, expect, it } from "vitest";
import { axisOf, cloneFlight, launch, predict, spinOf, stepFlight, yawOf, type Flight } from "./flight";
import { extent } from "./physics/ball-shape";
import { Rng } from "./rng";
import { dot3, len3, norm3, type V3 } from "./vec";

const fly = (vel: V3, style: "spiral" | "tumble" = "spiral", spin = 62, wobble = 0.03) => launch({ x: -50, y: 2, z: 0 }, vel, style, spin, wobble);

/** Steps a ball until it lands, noting the largest angle between its nose and its path. */
function carry(f: Flight): { x: number; t: number; yaw: number } {
  let yaw = 0;
  while (!f.grounded && f.t < 20) {
    stepFlight(f, 1 / 60);
    if (f.pos.y > 0.4) yaw = Math.max(yaw, yawOf(f));
  }
  return { x: f.pos.x + 50, t: f.t, yaw };
}

const pass = { x: 22 * Math.cos(0.5), y: 22 * Math.sin(0.5), z: 0 };

describe("a pass in the air", () => {
  it("falls short of the airless range because of drag", () => {
    const { x } = carry(fly(pass));
    const airless = (22 * 22 * Math.sin(1)) / 9.81;
    expect(x).toBeLessThan(airless + 1.5);
    expect(x).toBeGreaterThan(airless * 0.8);
  });

  it("keeps a tight spiral's nose along its arc, tipping over past the top", () => {
    const f = fly(pass);
    expect(axisOf(f).y).toBeGreaterThan(0.4);
    let worst = 0;
    while (f.vel.y > -6 && !f.grounded) {
      stepFlight(f, 1 / 60);
      worst = Math.max(worst, yawOf(f));
    }
    expect(axisOf(f).y).toBeLessThan(-0.2);
    expect(dot3(axisOf(f), norm3(f.vel))).toBeGreaterThan(0.95);
    expect(worst).toBeLessThan(0.26);
  });

  it("flies a weak, wobbly throw as a duck that turns side on and dies short", () => {
    const tight = carry(fly(pass));
    const duck = carry(fly(pass, "spiral", 18, 0.4));
    expect(duck.yaw).toBeGreaterThan(1);
    expect(duck.x).toBeLessThan(tight.x - 3);
  });

  it("tips a ball with no spin over: no gyroscope, no spiral", () => {
    expect(carry(fly(pass, "spiral", 0.5, 0)).yaw).toBeGreaterThan(1.2);
  });

  it("carries a spiral farther than a tumbling kick", () => {
    const vel = { x: 25, y: 16, z: 0 };
    expect(carry(fly(vel)).x).toBeGreaterThan(carry(fly(vel, "tumble", 24, 0)).x + 2);
  });

  it("drifts a right handed spiral only a little sideways", () => {
    const f = fly(pass);
    carry(f);
    expect(Math.abs(f.pos.z)).toBeLessThan(1.5);
  });

  it("keeps most of its spin through the flight", () => {
    const f = fly(pass);
    const spin0 = spinOf(f);
    while (f.pos.y > 0.6) stepFlight(f, 1 / 60);
    expect(spinOf(f)).toBeGreaterThan(spin0 * 0.85);
  });
});

describe("a kick in the air", () => {
  it("turns end over end, holding its spin across the long axis", () => {
    const f = fly({ x: 20, y: 18, z: 0 }, "tumble", 24, 0);
    const axes: V3[] = [];
    for (let i = 0; i < 60; i++) {
      stepFlight(f, 1 / 60);
      axes.push(axisOf(f));
    }
    // The nose sweeps round in the vertical plane of the kick.
    expect(Math.min(...axes.map((a) => a.y))).toBeLessThan(-0.6);
    expect(Math.max(...axes.map((a) => Math.abs(a.z)))).toBeLessThan(0.15);
    expect(Math.abs(spinOf(f))).toBeLessThan(2);
  });
});

describe("the integrator", () => {
  it("steps the same however the time is handed in", () => {
    const a = fly({ x: 18, y: 12, z: 3 });
    const b = cloneFlight(a);
    for (let i = 0; i < 90; i++) stepFlight(a, 1 / 60);
    for (let i = 0; i < 180; i++) stepFlight(b, 1 / 120);
    expect(b.pos).toEqual(a.pos);
    expect(b.q).toEqual(a.q);
  });

  it("predicts without touching the real ball", () => {
    const f = fly({ x: 15, y: 8, z: 3 });
    const ahead = predict(f, 0.5);
    expect(f.pos.x).toBe(-50);
    expect(ahead.pos.x).toBeGreaterThan(-44);
  });

  it("never sinks into the turf or goes NaN over long random flights", () => {
    const rng = new Rng(21);
    for (let n = 0; n < 25; n++) {
      const f = fly({ x: rng.range(-30, 30), y: rng.range(-5, 25), z: rng.range(-30, 30) }, rng.chance(0.5) ? "spiral" : "tumble", rng.range(0, 80), rng.range(0, 0.6));
      for (let i = 0; i < 60 * 12; i++) {
        stepFlight(f, 1 / 60);
        const low = f.pos.y - extent(f.q, { x: 0, y: -1, z: 0 });
        expect(low).toBeGreaterThan(-0.01);
        expect(Number.isFinite(f.pos.x + f.pos.y + f.pos.z + len3(f.L))).toBe(true);
      }
      // Everything comes to rest on the turf in the end.
      expect(len3(f.vel)).toBeLessThan(0.3);
    }
  });
});
