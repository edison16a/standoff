import { describe, expect, it } from "vitest";
import { LOOPS, NetSim, ROWS } from "./net-sim";
import { RimSpring, StandSway } from "./rim-spring";

const SHAPE = { origin: { x: 0, y: 3, z: 1.5 }, radius: 0.235, depth: 0.45, taper: 0.4 };
const H = 1 / 120;
const FAR = -99;

const knot = (net: NetSim, row: number, i: number) => {
  const k = (row * LOOPS + i) * 3;
  return { x: net.pos[k]!, y: net.pos[k + 1]!, z: net.pos[k + 2]! };
};
const ringRadius = (net: NetSim, row: number) => {
  let sum = 0;
  for (let i = 0; i < LOOPS; i++) {
    const p = knot(net, row, i);
    sum += Math.hypot(p.x - SHAPE.origin.x, p.z - SHAPE.origin.z);
  }
  return sum / LOOPS;
};
const bottomY = (net: NetSim) => Math.min(...Array.from({ length: LOOPS }, (_, i) => knot(net, ROWS, i).y));

function settled(): NetSim {
  const net = new NetSim(SHAPE);
  for (let i = 0; i < 600; i++) net.step(H, 0, FAR, 0, 0.12);
  return net;
}

describe("the cloth net", () => {
  it("hangs still under its own weight, tapering, with every number finite", () => {
    const net = settled();
    expect([...net.pos].every(Number.isFinite)).toBe(true);
    expect(ringRadius(net, ROWS)).toBeLessThan(ringRadius(net, 0) * 0.8);
    expect(SHAPE.origin.y - bottomY(net)).toBeGreaterThan(SHAPE.depth * 0.9);
    expect(SHAPE.origin.y - bottomY(net)).toBeLessThan(SHAPE.depth * 1.2);
  });

  it("is pushed down and out by a ball dropping through, and swings back", () => {
    const net = settled();
    const rest = bottomY(net);
    let lowest = rest;
    let widest = ringRadius(net, ROWS);
    // A ball falling through the ring at four metres a second, slowing to two.
    for (let t = 0, y = SHAPE.origin.y + 0.2; t < 0.4; t += H) {
      y -= (4 - 5 * t) * H;
      net.step(H, SHAPE.origin.x, y, SHAPE.origin.z, 0.124);
      lowest = Math.min(lowest, bottomY(net));
      widest = Math.max(widest, ringRadius(net, ROWS));
      for (let j = 1; j <= ROWS; j++) {
        for (let i = 0; i < LOOPS; i++) {
          const p = knot(net, j, i);
          // No knot is left inside the ball.
          expect(Math.hypot(p.x - SHAPE.origin.x, p.y - y, p.z - SHAPE.origin.z)).toBeGreaterThan(0.124 - 0.02);
        }
      }
    }
    expect(lowest).toBeLessThan(rest - 0.03);
    expect(widest).toBeGreaterThan(0.12);
    for (let i = 0; i < 480; i++) net.step(H, 0, FAR, 0, 0.12);
    expect(bottomY(net)).toBeCloseTo(rest, 1);
  });
});

describe("the rim on its spring", () => {
  it("rings after a hit and settles back level within a second", () => {
    const rim = new RimSpring();
    rim.knock(1, 0, 0.6);
    let lowest = 0;
    for (let t = 0; t < 1.2; t += 1 / 60) {
      rim.step(1 / 60);
      lowest = Math.min(lowest, rim.pitch);
    }
    expect(lowest).toBeLessThan(-0.02);
    expect(Math.abs(rim.pitch)).toBeLessThan(0.003);
  });

  it("rocks the whole basket a little on a slam, barely on a soft touch, and settles", () => {
    const slam = new StandSway();
    const touch = new StandSway();
    slam.knock(1);
    touch.knock(0.2);
    let most = 0;
    let least = 0;
    for (let t = 0; t < 0.5; t += 1 / 60) {
      slam.step(1 / 60);
      touch.step(1 / 60);
      most = Math.max(most, Math.abs(slam.angle));
      least = Math.max(least, Math.abs(touch.angle));
    }
    // A centimetre or two at the top of a stanchion three and a half metres from its foot.
    expect(most * 3.5).toBeGreaterThan(0.008);
    expect(most * 3.5).toBeLessThan(0.03);
    expect(least).toBeLessThan(most / 10);
    for (let t = 0; t < 6; t += 1 / 60) slam.step(1 / 60);
    expect(Math.abs(slam.angle)).toBeLessThan(most / 20);
  });

  it("stays bent while a dunker hangs and springs back when he lets go", () => {
    const rim = new RimSpring();
    rim.hold(true);
    for (let t = 0; t < 1; t += 1 / 60) rim.step(1 / 60);
    expect(rim.pitch).toBeLessThan(-0.08);
    rim.hold(false);
    for (let t = 0; t < 1.5; t += 1 / 60) rim.step(1 / 60);
    expect(Math.abs(rim.pitch)).toBeLessThan(0.005);
  });
});
