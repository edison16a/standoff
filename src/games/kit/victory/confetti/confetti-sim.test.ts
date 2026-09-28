import { describe, expect, it } from "vitest";
import { coneDirection, ConfettiSim, FLYING, LANDED } from "./confetti-sim";

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("ConfettiSim", () => {
  it("drifts down at a paper pace, not a stone's", () => {
    const sim = new ConfettiSim(200, seeded(1), { wind: { x: 0, z: 0 } });
    sim.spawn(200, { kind: "rain", at: { x: 0, y: 30, z: 0 }, radius: 2 });
    for (let t = 0; t < 3; t += 1 / 60) sim.step(1 / 60);
    let total = 0;
    for (let i = 0; i < sim.count; i++) total += -sim.velocity[i * 3 + 1]!;
    const mean = total / sim.count;
    // A falling stone would be at 29 m/s by now. Paper settles around one to three.
    expect(mean).toBeGreaterThan(0.8);
    expect(mean).toBeLessThan(4);
  });

  it("a cannon throws pieces up before they come down", () => {
    const sim = new ConfettiSim(50, seeded(2), { floorY: -100 });
    sim.spawn(50, { kind: "burst", at: { x: 0, y: 1, z: 0 }, direction: { x: 0, y: 1, z: 0 }, speed: 12, spread: 0.3 });
    sim.step(0.05);
    let rising = 0;
    for (let i = 0; i < sim.count; i++) if (sim.velocity[i * 3 + 1]! > 0) rising++;
    expect(rising).toBe(50);
    for (let t = 0; t < 4; t += 0.1) sim.step(0.1);
    let falling = 0;
    for (let i = 0; i < sim.count; i++) if (sim.velocity[i * 3 + 1]! < 0) falling++;
    expect(falling).toBeGreaterThan(40);
  });

  it("pieces land flat on the floor and stay", () => {
    const sim = new ConfettiSim(30, seeded(3), { floorY: 0.5 });
    sim.spawn(30, { kind: "rain", at: { x: 0, y: 2, z: 0 }, radius: 1 });
    for (let t = 0; t < 12; t += 0.1) sim.step(0.1);
    for (let i = 0; i < sim.count; i++) {
      expect(sim.state[i]).toBe(LANDED);
      expect(sim.position[i * 3 + 1]).toBeGreaterThanOrEqual(0.5);
      expect(sim.position[i * 3 + 1]).toBeLessThan(0.51);
      expect(sim.rotation[i * 3]).toBe(0);
    }
  });

  it("reuses pieces that have lain long enough, never ones in the air", () => {
    const sim = new ConfettiSim(10, seeded(4), { restS: 1 });
    sim.spawn(10, { kind: "rain", at: { x: 0, y: 50, z: 0 }, radius: 1 });
    sim.spawn(5, { kind: "rain", at: { x: 0, y: 50, z: 0 }, radius: 1 });
    expect(sim.flying).toBe(10);
    sim.clear();
    expect(sim.flying).toBe(0);
    sim.spawn(3, { kind: "rain", at: { x: 0, y: 0.2, z: 0 }, radius: 1 });
    for (let t = 0; t < 3; t += 0.1) sim.step(0.1);
    sim.spawn(3, { kind: "rain", at: { x: 0, y: 5, z: 0 }, radius: 1 });
    expect(sim.state.filter((s) => s === FLYING).length).toBe(3);
  });

  it("a cannon carries several metres up before the air takes it", () => {
    const sim = new ConfettiSim(40, seeded(9), { floorY: -100 });
    sim.spawn(40, { kind: "burst", at: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 1, z: 0 }, speed: 12, spread: 0.1 });
    let top = 0;
    for (let t = 0; t < 2; t += 1 / 60) {
      sim.step(1 / 60);
      for (let i = 0; i < sim.count; i++) top = Math.max(top, sim.position[i * 3 + 1]!);
    }
    expect(top).toBeGreaterThan(3);
    expect(top).toBeLessThan(9);
  });

  it("aims cannon shots inside their cone", () => {
    const random = seeded(5);
    for (let k = 0; k < 100; k++) {
      const d = coneDirection({ x: 1, y: 1, z: 0 }, 0.25, random(), random());
      const cos = (d.x + d.y) / Math.SQRT2;
      expect(Math.acos(Math.min(1, cos))).toBeLessThanOrEqual(0.2501);
    }
  });
});
