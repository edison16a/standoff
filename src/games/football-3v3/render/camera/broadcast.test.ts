import { describe, expect, it } from "vitest";
import type { MatchView } from "../../engine/view";
import { broadcastAim, Spring3, springStep } from "./broadcast";
import type { Aim } from "./shots";

const aim: Aim = { pos: { x: -10, y: 7, z: 0 }, look: { x: 10, y: 0.6, z: 0 }, fov: 52, rate: 4, kind: "behind" };
const view = (phase: string, vx: number, vz: number) => ({ phase, ball: { vx, vz } }) as unknown as MatchView;

describe("broadcast camera", () => {
  it("settles on its target without overshooting", () => {
    let x = 0;
    let v = 0;
    let peak = 0;
    for (let i = 0; i < 600; i++) {
      [x, v] = springStep(x, v, 1, 6, 1 / 60);
      peak = Math.max(peak, x);
    }
    expect(x).toBeCloseTo(1, 4);
    expect(peak).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("eases in rather than jumping on the first frame", () => {
    const [x] = springStep(0, 0, 1, 6, 1 / 60);
    expect(x).toBeLessThan(1 - Math.exp(-6 / 60));
  });

  it("stays stable with a long frame", () => {
    const s = new Spring3();
    s.step({ x: 10, y: 0, z: 0 }, 8, 0.5);
    expect(s.at.x).toBeGreaterThan(0);
    expect(s.at.x).toBeLessThanOrEqual(10);
  });

  it("leads a moving ball, within a limit", () => {
    const out = broadcastAim(aim, view("live", 8, -100));
    expect(out.look.x).toBeCloseTo(10 + 8 * 0.35);
    expect(out.look.z).toBe(-3.5);
  });

  it("tightens before the snap and opens with a fast play", () => {
    expect(broadcastAim(aim, view("presnap", 0, 0)).fov).toBeLessThan(52);
    expect(broadcastAim(aim, view("live", 12, 0)).fov).toBeGreaterThan(52);
  });

  it("leaves other shots alone", () => {
    const kick: Aim = { ...aim, kind: "kick" };
    expect(broadcastAim(kick, view("live", 8, 0))).toBe(kick);
  });
});
