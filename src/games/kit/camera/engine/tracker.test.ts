import { describe, expect, it } from "vitest";
import { baselineFor } from "./sequence";
import { syntheticPose, type PoseSpec } from "./synthetic";
import { poseAt, MOVES, type PoseKey } from "./timeline";
import { PoseTracker, type TrackFrame } from "./tracker";

const ASPECT = 16 / 9;

/** Plays one timeline per person, feeding the tracker the people in a shuffled order like the model does. */
function play(tracker: PoseTracker, people: PoseKey[][], ms: number, start = 0): TrackFrame[] {
  const frames: TrackFrame[] = [];
  for (let t = 0; t <= ms; t += 33) {
    const poses = people.map((keys) => syntheticPose(poseAt(keys, t), ASPECT));
    if ((t / 33) % 2 === 1) poses.reverse();
    frames.push(tracker.update(poses, start + t, ASPECT));
  }
  return frames;
}

const stand = (pose: PoseSpec): PoseKey[] => [{ at: 0, pose }];

describe("tracking players frame by frame", () => {
  it("makes the person on the left player one and keeps them there", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const frames = play(tracker, [stand({ x: 0.72 }), stand({ x: 0.28 })], 1000);
    for (const frame of frames) {
      expect(frame.bodies[0]!.hips.x).toBeCloseTo(0.28, 2);
      expect(frame.bodies[1]!.hips.x).toBeCloseTo(0.72, 2);
    }
  });

  it("reads each player's own moves in their own slot", () => {
    const tracker = new PoseTracker({ slots: 2 });
    tracker.setBaseline(1, baselineFor({ x: 0.28 }, 1));
    tracker.setBaseline(2, baselineFor({ x: 0.72 }, 2));
    const frames = play(tracker, [MOVES.jump({ x: 0.28 }), MOVES.duck({ x: 0.72 })], 1500);
    const events = frames.flatMap((f) => f.events).filter((e) => e.type === "jump" || e.type === "duck");
    expect(events.map((e) => [e.slot, e.type])).toEqual([
      [1, "jump"],
      [2, "duck"],
    ]);
  });

  it("drops the model's faint ghosts", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const frame = tracker.update([syntheticPose({ x: 0.3 }), syntheticPose({ x: 0.7, visibility: 0.2 })], 0, ASPECT);
    expect(frame.bodies[0]).not.toBeNull();
    expect(frame.bodies[1]).toBeNull();
  });

  it("rides out a dropped frame, then says the player is away, then back", () => {
    const tracker = new PoseTracker({ slots: 1, graceMs: 250 });
    play(tracker, [stand({})], 300);
    const blip = tracker.update([], 333, ASPECT);
    expect(blip.bodies[0]).not.toBeNull();
    expect(blip.events).toEqual([]);
    tracker.update([], 450, ASPECT);
    const gone = tracker.update([], 700, ASPECT);
    expect(gone.bodies[0]).toBeNull();
    const back = tracker.update([syntheticPose({ x: 0.6 }, ASPECT)], 2000, ASPECT);
    expect(back.events.map((e) => e.type)).toContain("back");
    // Coming back starts the smoothing afresh, so the body appears where it is.
    expect(back.bodies[0]!.hips.x).toBeCloseTo(0.6, 3);
  });

  it("lets a test put a pose straight into a slot, or empty it", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const overrides = new Map([
      [1, syntheticPose({ x: 0.8 }, ASPECT)],
      [2, null],
    ]);
    const frame = tracker.update([syntheticPose({ x: 0.2 }, ASPECT), syntheticPose({ x: 0.7 }, ASPECT)], 0, ASPECT, overrides);
    expect(frame.bodies[0]!.hips.x).toBeCloseTo(0.8, 3);
    expect(frame.bodies[1]).toBeNull();
  });

  it("hands out baselines and tuning per slot", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const baseline = baselineFor({ x: 0.72 }, 2);
    tracker.setBaseline(2, baseline);
    expect(tracker.baseline(2)).toBe(baseline);
    expect(tracker.baseline(1)).toBeNull();
    tracker.configure({ lane: { lanes: 5 } });
    const frame = tracker.update([syntheticPose({ x: 0.72 }, ASPECT)], 0, ASPECT);
    expect(frame.moves[1]!.calibrated).toBe(true);
    expect(frame.moves[0]!.calibrated).toBe(false);
  });
});
