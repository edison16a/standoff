import { describe, expect, it } from "vitest";
import { MOVES, MoveReader, type PoseKey, type PoseSpec } from "@/games/kit/camera";
import { deriveBody, type Body } from "@/games/kit/camera/engine/body";
import { baselineFor } from "@/games/kit/camera/engine/sequence";
import { LandmarkSmoother } from "@/games/kit/camera/engine/smoothing";
import { syntheticPose } from "@/games/kit/camera/engine/synthetic";
import { poseAt, timelineLength } from "@/games/kit/camera/engine/timeline";
import { JUMP_SMOOTHING, JUMP_TUNING } from "./jump-tuning";
import { TakeoffTracker } from "./takeoff";

/** The body starts to move at this time, so the camera's frames fall at a different point of each move. */
const LEAD = 1000;

/** A steady random source, so the model's jitter is the same on every run. */
function jitter(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647 - 0.5) * 2;
  };
}

/**
 * Plays a movement through Cube Game's smoothing and jump reading, as the
 * camera kit does, at 30 frames a second. Returns when each jump was seen
 * and when the game places its take off, both from when the body moved.
 */
function watch(keys: PoseKey[], phase = 0, noise = 0.002, base: PoseSpec = {}): { seen: number; takeoff: number }[] {
  const reader = new MoveReader(1, JUMP_TUNING);
  reader.setBaseline(baselineFor(base, 1));
  const smoother = new LandmarkSmoother(JUMP_SMOOTHING);
  const takeoff = new TakeoffTracker(1);
  const shake = jitter(7 + phase);
  const timeline = [{ at: 0, pose: base }, ...keys.map((k) => ({ ...k, at: k.at + LEAD + phase }))];
  const out: { seen: number; takeoff: number }[] = [];
  let previous: Body | null = null;
  for (let t = 0; t <= timelineLength(timeline) + 300; t += 1000 / 30) {
    const raw = syntheticPose(poseAt(timeline, t), 16 / 9);
    raw.landmarks = raw.landmarks.map((p) => ({ ...p, x: p.x + shake() * noise, y: p.y + shake() * noise }));
    previous = deriveBody(smoother.smooth(raw, t), t, 16 / 9, previous);
    const events = reader.update(previous, t);
    takeoff.add(1, t, reader.current.head.rise);
    for (const event of events) if (event.type === "jump") out.push({ seen: t - LEAD - phase, takeoff: takeoff.takeoff(1, t) - LEAD - phase });
  }
  return out;
}

const hop: PoseKey[] = [
  { at: 0, pose: {} },
  { at: 130, pose: { lift: 0.12 } },
  { at: 260, pose: { lift: 0.12 } },
  { at: 400, pose: {} },
];
const PHASES = [0, 5, 11, 17, 23, 29];

describe("how soon Cube Game sees a camera jump", () => {
  it("sees a full jump within 90 ms, and places its take off within 40 ms of the real one", () => {
    for (const phase of PHASES) {
      const [jump] = watch(MOVES.jump(), phase);
      expect(jump!.seen).toBeLessThanOrEqual(90);
      expect(Math.abs(jump!.takeoff)).toBeLessThanOrEqual(40);
    }
  });

  it("places a small quick hop's take off well before it was seen", () => {
    for (const phase of PHASES) {
      const [jump] = watch(hop, phase);
      expect(jump!.seen - jump!.takeoff).toBeGreaterThanOrEqual(30);
      expect(Math.abs(jump!.takeoff)).toBeLessThanOrEqual(50);
    }
  });

  it("still ignores bobbing to the beat, nodding and tiptoes, with the model's jitter", () => {
    const bob: PoseKey[] = Array.from({ length: 16 }, (_, i) => ({ at: i * 160, pose: { crouch: i % 2 ? 0.2 : 0, lift: i % 4 === 2 ? 0.03 : 0 } }));
    const bounce: PoseKey[] = Array.from({ length: 16 }, (_, i) => ({ at: i * 120, pose: { crouch: i % 2 ? 0.3 : 0, lift: i % 2 ? 0 : 0.035 } }));
    const nod: PoseKey[] = Array.from({ length: 12 }, (_, i) => ({ at: i * 200, pose: { nod: i % 2 ? -0.8 : 0.8 } }));
    const toes: PoseKey[] = [{ at: 0, pose: {} }, { at: 120, pose: { lift: 0.04 } }, { at: 240, pose: {} }];
    for (const phase of PHASES) for (const keys of [bob, bounce, nod, toes]) expect(watch(keys, phase)).toHaveLength(0);
  });

  it("keeps a still player's take off where it was seen when there is no rise to trace", () => {
    const takeoff = new TakeoffTracker(2);
    expect(takeoff.takeoff(2, 500)).toBe(500);
    takeoff.add(1, 0, 0.3);
    takeoff.add(1, 33, 0.3);
    expect(takeoff.takeoff(1, 33)).toBe(33);
  });

  it("never reaches back further than a short moment", () => {
    const takeoff = new TakeoffTracker(1);
    for (let i = 0; i < 12; i++) takeoff.add(1, i * 33, i * 0.05);
    expect(takeoff.takeoff(1, 11 * 33)).toBeGreaterThanOrEqual(11 * 33 - 160);
  });
});
