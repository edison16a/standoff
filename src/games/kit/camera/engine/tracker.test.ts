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
/** Two players share the picture, so they stand a little further back than one alone. Still waist up. */
const PAIR = { height: 1.3 };
const P1 = { ...PAIR, x: 0.28 };
const P2 = { ...PAIR, x: 0.72 };

describe("tracking players frame by frame", () => {
  it("makes the person on the left player one and keeps them there", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const frames = play(tracker, [stand(P2), stand(P1)], 1000);
    for (const frame of frames) {
      expect(frame.bodies[0]!.shoulders.x).toBeCloseTo(0.28, 2);
      expect(frame.bodies[1]!.shoulders.x).toBeCloseTo(0.72, 2);
      expect(frame.bodies.every((body) => !body!.hipsSeen)).toBe(true);
    }
  });

  it("reads each player's own moves against their own head line", () => {
    const tracker = new PoseTracker({ slots: 2 });
    tracker.setBaseline(1, baselineFor(P1, 1));
    tracker.setBaseline(2, baselineFor({ ...P2, head: 0.4 }, 2));
    const p2 = { ...P2, head: 0.4 };
    const frames = play(tracker, [[...MOVES.jump(P1), ...MOVES.step(P1, 0.15).map((k) => ({ ...k, at: k.at + 1000 }))], MOVES.duck(p2)], 2000);
    const events = frames.flatMap((f) => f.events).filter((e) => e.type === "jump" || e.type === "duck" || e.type === "lane");
    expect(events.map((e) => [e.slot, e.type])).toEqual([
      [1, "jump"],
      [2, "duck"],
      [1, "lane"],
    ]);
    const lines = frames.at(-1)!.moves.map((m) => m.line!);
    expect(lines[0]!.x).toBeCloseTo(0.28, 2);
    expect(lines[1]!.y).toBeGreaterThan(lines[0]!.y);
  });

  it("drops the model's faint ghosts", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const frame = tracker.update([syntheticPose(P1), syntheticPose({ ...P2, visibility: 0.2 })], 0, ASPECT);
    expect(frame.bodies[0]).not.toBeNull();
    expect(frame.bodies[1]).toBeNull();
  });

  it("waits longer for a player lost mid jump, whose head may have left the picture", () => {
    const tracker = new PoseTracker({ slots: 1, graceMs: 250 });
    tracker.setBaseline(1, baselineFor({}));
    play(tracker, [[{ at: 0, pose: {} }, { at: 150, pose: { lift: 0.2 } }]], 200);
    expect(tracker.update([], 233, ASPECT).moves[0]!.jumping).toBe(true);
    const later = tracker.update([], 600, ASPECT);
    expect(later.bodies[0]).not.toBeNull();
    expect(later.events).toEqual([]);
    const gone = tracker.update([], 1000, ASPECT);
    expect(gone.events.map((e) => e.type)).toEqual(["away"]);
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
    expect(back.bodies[0]!.shoulders.x).toBeCloseTo(0.6, 3);
  });

  it("lets a test put a pose straight into a slot, or empty it", () => {
    const tracker = new PoseTracker({ slots: 2 });
    const overrides = new Map([
      [1, syntheticPose({ x: 0.8 }, ASPECT)],
      [2, null],
    ]);
    const frame = tracker.update([syntheticPose({ x: 0.2 }, ASPECT), syntheticPose({ x: 0.7 }, ASPECT)], 0, ASPECT, overrides);
    expect(frame.bodies[0]!.shoulders.x).toBeCloseTo(0.8, 3);
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
