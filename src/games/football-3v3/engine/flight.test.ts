import { describe, expect, it } from "vitest";
import { launch, predict, stepFlight } from "./flight";
import { dot3, len3, norm3 } from "./vec";

const fly = (vel: { x: number; y: number; z: number }, style: "spiral" | "tumble" = "spiral", wobble = 0) =>
  launch({ x: 0, y: 2, z: 0 }, vel, style, 62, wobble);

/** Steps a ball until it lands and returns how far it went and for how long. */
function carry(f: ReturnType<typeof fly>): { x: number; t: number } {
  let t = 0;
  while (f.pos.y > 0 && t < 20) {
    stepFlight(f, 1 / 120);
    t += 1 / 120;
  }
  return { x: f.pos.x, t };
}

describe("ball flight", () => {
  it("falls short of the airless range because of drag", () => {
    const v = 22;
    const angle = Math.PI / 5;
    const { x } = carry(fly({ x: v * Math.cos(angle), y: v * Math.sin(angle), z: 0 }));
    const airless = (v * v * Math.sin(2 * angle)) / 9.81;
    expect(x).toBeLessThan(airless);
    expect(x).toBeGreaterThan(airless * 0.75);
  });

  it("carries a spiral farther than a tumbling ball", () => {
    const vel = { x: 25, y: 16, z: 0 };
    expect(carry(fly(vel)).x).toBeGreaterThan(carry(fly(vel, "tumble")).x);
  });

  it("tips the spiral's nose over to follow the arc", () => {
    const f = fly({ x: 18, y: 12, z: 0 });
    expect(f.axis.y).toBeGreaterThan(0.4);
    for (let i = 0; i < 180; i++) stepFlight(f, 1 / 120);
    // Past the top of the arc the nose points down, near the path.
    expect(f.vel.y).toBeLessThan(0);
    expect(f.nose.y).toBeLessThan(0);
    expect(dot3(f.nose, norm3(f.vel))).toBeGreaterThan(0.9);
  });

  it("wobbles around the nose and settles", () => {
    const f = fly({ x: 18, y: 10, z: 0 }, "spiral", 0.12);
    stepFlight(f, 1 / 120);
    const off = Math.acos(Math.min(1, dot3(f.axis, f.nose)));
    expect(off).toBeGreaterThan(0.1);
    for (let i = 0; i < 120; i++) stepFlight(f, 1 / 120);
    expect(f.wobble).toBeLessThan(0.12);
    expect(len3(f.axis)).toBeCloseTo(1);
  });

  it("spins a spiral about its axis and flips a kick end over end", () => {
    const f = fly({ x: 20, y: 10, z: 0 }, "tumble");
    f.spin = 20;
    const start = { ...f.axis };
    for (let i = 0; i < 20; i++) stepFlight(f, 1 / 120);
    expect(f.roll).toBeCloseTo(20 * (20 / 120));
    expect(dot3(start, f.axis)).toBeLessThan(0.9);
  });

  it("predicts without touching the real ball", () => {
    const f = fly({ x: 15, y: 8, z: 3 });
    const ahead = predict(f, 0.5);
    expect(f.pos.x).toBe(0);
    expect(ahead.pos.x).toBeGreaterThan(6);
  });
});
