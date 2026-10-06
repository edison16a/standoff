import { describe, expect, it } from "vitest";
import { BroadcastCamera, FOV, spreadAround, type PlayInput } from "./broadcast";

const run = (cam: BroadcastCamera, play: PlayInput, seconds: number) => {
  let f = cam.frame(play, 16 / 9, 0, true);
  for (let t = 0; t < seconds; t += 1 / 60) f = cam.frame(play, 16 / 9, 1 / 60, false);
  return f;
};
const still = (x: number, players = [{ x: x + 2, z: 0 }, { x: x - 2, z: 1 }, { x, z: 3 }]): PlayInput => ({ ball: { x, z: 0, vx: 0, vz: 0 }, players });

describe("the broadcast camera", () => {
  it("settles on a still ball", () => {
    const f = run(new BroadcastCamera(), still(5), 6);
    expect(f.look.x).toBeCloseTo(5 * 0.92, 1);
  });

  it("looks ahead of a ball on the move", () => {
    const play: PlayInput = { ball: { x: 0, z: 0, vx: 8, vz: 0 }, players: [] };
    expect(run(new BroadcastCamera(), play, 4).look.x).toBeGreaterThan(2);
  });

  it("pans smoothly: no jump from one frame to the next when the ball is hit away", () => {
    const cam = new BroadcastCamera();
    run(cam, still(0), 3);
    const kicked: PlayInput = { ball: { x: 0, z: 0, vx: 25, vz: 0 }, players: [] };
    let last = cam.frame(kicked, 16 / 9, 1 / 60, false).look.x;
    for (let i = 0; i < 120; i++) {
      kicked.ball.x += 25 / 60;
      const x = cam.frame(kicked, 16 / 9, 1 / 60, false).look.x;
      expect(Math.abs(x - last)).toBeLessThan(0.5);
      last = x;
    }
  });

  it("zooms in on a tight tussle and out when play is stretched", () => {
    const tight = run(new BroadcastCamera(), still(0, [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }]), 8);
    const wide = run(new BroadcastCamera(), still(0, [{ x: 12, z: 0 }, { x: -12, z: 0 }, { x: 0, z: 12 }]), 8);
    expect(tight.fov).toBeLessThan(wide.fov);
    expect(tight.fov).toBeGreaterThanOrEqual(FOV.tight - 0.01);
    expect(wide.fov).toBeLessThanOrEqual(FOV.wide + 0.01);
  });

  it("keeps the goal in the picture at either end", () => {
    const f = run(new BroadcastCamera(), still(30), 6);
    expect(f.look.x).toBeLessThan(24 * 0.8 + 0.01);
  });

  it("measures the spread from the nearest three", () => {
    expect(spreadAround(still(0, [{ x: 3, z: 0 }, { x: 0, z: 3 }, { x: -3, z: 0 }, { x: 40, z: 0 }]))).toBeCloseTo(3);
  });
});
