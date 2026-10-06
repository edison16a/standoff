import { describe, expect, it } from "vitest";
import { BroadcastFraming, MAX_LEAD, Spring3, spreadOf, zoomFor } from "./broadcast-framing";

describe("Spring3", () => {
  it("settles on a still target without overshooting", () => {
    const s = new Spring3();
    s.snap({ x: 0, y: 0, z: 0 });
    let most = 0;
    for (let i = 0; i < 240; i++) most = Math.max(most, s.step({ x: 10, y: 0, z: 0 }, 0.5, 1 / 60).x);
    expect(s.at.x).toBeCloseTo(10, 2);
    expect(most).toBeLessThanOrEqual(10 + 1e-6);
  });

  it("starts a move gently rather than jumping", () => {
    const s = new Spring3();
    s.snap({ x: 0, y: 0, z: 0 });
    const first = s.step({ x: 10, y: 0, z: 0 }, 0.5, 1 / 60).x;
    expect(first).toBeLessThan(0.1);
  });

  it("stays stable on a long frame", () => {
    const s = new Spring3();
    s.snap({ x: 0, y: 0, z: 0 });
    s.step({ x: 5, y: 0, z: 0 }, 0.2, 0.25);
    expect(Number.isFinite(s.at.x)).toBe(true);
    expect(s.at.x).toBeLessThanOrEqual(5);
  });
});

describe("BroadcastFraming", () => {
  it("leads a moving play in its direction, up to the limit", () => {
    const f = new BroadcastFraming();
    let out = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 120; i++) out = f.lead({ x: i * (6 / 60), y: 1, z: 4 }, 1 / 60);
    const ballX = 119 * (6 / 60);
    expect(out.x).toBeGreaterThan(ballX + 1.5);
    expect(out.x - ballX).toBeLessThanOrEqual(MAX_LEAD + 1e-9);
    expect(out.z).toBeCloseTo(4);
  });

  it("ignores a jump of the focus such as a reset", () => {
    const f = new BroadcastFraming();
    f.lead({ x: 0, y: 1, z: 4 }, 1 / 60);
    const out = f.lead({ x: 0, y: 1, z: 12 }, 1 / 60);
    expect(out.z).toBeCloseTo(12);
  });
});

describe("zoom", () => {
  it("tightens for bunched players and widens for a spread floor", () => {
    expect(zoomFor(1, 36)).toBe(33);
    expect(zoomFor(8, 36)).toBe(39);
    expect(zoomFor(4, 36)).toBeCloseTo(36);
  });

  it("measures the spread round the play", () => {
    expect(spreadOf([{ x: 3, z: 0 }, { x: -3, z: 0 }], { x: 0, z: 0 })).toBeCloseTo(3);
    expect(spreadOf([], { x: 0, z: 0 })).toBe(4);
  });
});
