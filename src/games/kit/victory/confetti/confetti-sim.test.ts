import { describe, expect, it } from "vitest";
import { ConfettiSim } from "./confetti-sim";

function run(sim: ConfettiSim, seconds: number, dt = 1 / 60): void {
  for (let t = 0; t < seconds; t += dt) sim.step(dt, t);
}

describe("ConfettiSim", () => {
  it("showers pieces inside the disc and above the floor", () => {
    const sim = new ConfettiSim(500, 3);
    sim.shower({ centre: { x: 2, y: 0, z: -1 }, radius: 3, height: 5, count: 500 });
    expect(sim.live).toBe(500);
    for (let i = 0; i < 500; i++) {
      const x = sim.position[i * 3]! - 2;
      const z = sim.position[i * 3 + 2]! + 1;
      expect(Math.hypot(x, z)).toBeLessThanOrEqual(3.0001);
      expect(sim.position[i * 3 + 1]).toBeGreaterThanOrEqual(5);
    }
  });

  it("falls no faster than paper does once the air has it", () => {
    const sim = new ConfettiSim(50, 1, { flutter: 0 });
    sim.cannon({ from: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: -1, z: 0 }, spread: 0.1, speed: 20, count: 50 });
    sim.shower({ centre: { x: 0, y: 0, z: 0 }, radius: 1, height: 40, count: 50 });
    run(sim, 2);
    for (let i = 0; i < 50; i++) if (sim.state[i] === 1) expect(sim.velocity[i * 3 + 1]).toBeGreaterThan(-sim.tuning.terminal - 0.01);
  });

  it("fires a cannon out along its barrel, then slows it down", () => {
    const sim = new ConfettiSim(200, 5, { flutter: 0, wind: { x: 0, y: 0, z: 0 } });
    sim.cannon({ from: { x: 0, y: 0.5, z: 0 }, direction: { x: 1, y: 1, z: 0 }, spread: 0.2, speed: 14, count: 200 });
    for (let i = 0; i < 200; i++) {
      expect(sim.velocity[i * 3]).toBeGreaterThan(0);
      expect(sim.velocity[i * 3 + 1]).toBeGreaterThan(0);
      expect(Math.abs(sim.velocity[i * 3 + 2]!)).toBeLessThan(sim.velocity[i * 3]!);
    }
    let peak = 0;
    for (let t = 0; t < 1.5; t += 1 / 60) {
      sim.step(1 / 60, t);
      for (let i = 0; i < 200; i++) peak = Math.max(peak, sim.position[i * 3 + 1]!);
    }
    // The clump carries a few metres up, then the paper opens out and drags to a stop.
    expect(peak).toBeGreaterThan(2.5);
    expect(peak).toBeLessThan(8);
    for (let i = 0; i < 200; i++) expect(Math.abs(sim.velocity[i * 3 + 1]!)).toBeLessThan(1.5);
  });

  it("settles flat on the floor and stays there", () => {
    const sim = new ConfettiSim(100, 9, { floor: 0.2 });
    sim.shower({ centre: { x: 0, y: 0.2, z: 0 }, radius: 2, height: 1, count: 100 });
    run(sim, 8);
    for (let i = 0; i < 100; i++) {
      expect(sim.state[i]).toBe(2);
      expect(sim.position[i * 3 + 1]).toBeGreaterThanOrEqual(0.2);
      expect(sim.position[i * 3 + 1]).toBeLessThan(0.21);
      expect(sim.rotation[i * 3]).toBeCloseTo(-Math.PI / 2);
    }
    const before = sim.position.slice();
    run(sim, 1);
    expect(sim.position).toEqual(before);
  });

  it("reuses the oldest pieces when more are fired than it holds", () => {
    const sim = new ConfettiSim(10, 2);
    sim.shower({ centre: { x: 0, y: 0, z: 0 }, radius: 1, height: 3, count: 25 });
    expect(sim.live).toBe(10);
    sim.clear();
    expect(sim.live).toBe(0);
  });

  it("plays the same from the same seed", () => {
    const a = new ConfettiSim(40, 8);
    const b = new ConfettiSim(40, 8);
    for (const sim of [a, b]) {
      sim.cannon({ from: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 }, spread: 0.5, speed: 10, count: 40 });
      run(sim, 1.5);
    }
    expect(a.position).toEqual(b.position);
  });
});
