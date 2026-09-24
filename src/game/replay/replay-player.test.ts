import { describe, expect, it } from "vitest";
import type { SceneFrame } from "../frames";
import { ReplayPlayer } from "./replay-player";

function frames(from: number, to: number): SceneFrame[] {
  const out: SceneFrame[] = [];
  for (let t = from; t <= to; t += 10) {
    const fencer = {
      slot: 1 as const, characterId: "vale" as const, x: t / 1000, facing: 1 as const, pitch: 0, yaw: 0, roll: 0,
      speed: 0, action: "idle" as const, actionMs: 0, parrying: false,
    };
    out.push({ t, fencers: [fencer, { ...fencer, slot: 2 }] });
  }
  return out;
}

describe("ReplayPlayer", () => {
  it("slows down around the touch and takes longer than the clip", () => {
    const player = new ReplayPlayer(frames(0, 4000), [], 3000);
    expect(player.durationMs).toBeGreaterThan(4000);
    expect(player.isSlow(100)).toBe(false);
    expect(player.clipTime(2500)).toBeCloseTo(2500);
    expect(player.isSlow(2800)).toBe(true);
    expect(player.isFinished(player.durationMs)).toBe(true);
  });

  it("interpolates between recorded frames", () => {
    const player = new ReplayPlayer(frames(0, 1000), [], 900);
    const frame = player.frameAt(105);
    expect(frame?.fencers[0].x).toBeCloseTo(0.105, 5);
  });

  it("hands back each event once as the playhead passes it", () => {
    const events = [{ type: "jab" as const, t: 500, slot: 1 as const }];
    const player = new ReplayPlayer(frames(0, 1000), events, 900);
    expect(player.eventsUntil(400)).toEqual([]);
    expect(player.eventsUntil(800)).toEqual(events);
    expect(player.eventsUntil(900)).toEqual([]);
  });
});
