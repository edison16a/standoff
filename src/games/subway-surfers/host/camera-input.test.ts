import { describe, expect, it } from "vitest";
import { MOVES, type PoseKey } from "@/games/kit/camera";
import { readMoves } from "@/games/kit/camera/engine/sequence";
import { CameraInput } from "./camera-input";

/** Plays a waist up movement through the kit and the runner's camera input, and lists what the runner is told. */
function play(keys: PoseKey[]) {
  const input = new CameraInput();
  const told: { time: number; what: string }[] = [];
  let lane = 0;
  let rolling = false;
  for (const frame of readMoves(keys, {}, { smooth: true, tail: 800 })) {
    for (const event of frame.events) input.see(event);
    const intent = input.take(frame.state)!;
    const t = frame.body.time;
    if (intent.jump) told.push({ time: t, what: "jump" });
    if (intent.duck) told.push({ time: t, what: "roll" });
    if (intent.lane !== lane) told.push({ time: t, what: `lane ${intent.lane}` });
    if (intent.ducking !== rolling) told.push({ time: t, what: intent.ducking ? "down" : "up" });
    lane = intent.lane;
    rolling = intent.ducking;
  }
  return told.map((t) => t.what);
}

/** A real jump: a dip to push off, the flight, then the knees bending by `crouch` to land. */
const jump = (crouch: number): PoseKey[] => [
  { at: 0, pose: {} },
  { at: 120, pose: { crouch: 0.15 } },
  { at: 260, pose: { lift: 0.22 } },
  { at: 420, pose: { lift: 0.2 } },
  { at: 540, pose: { crouch: 0.1 } },
  { at: 640, pose: { crouch } },
  { at: 900, pose: {} },
];

describe("steering the runner with the head line, waist up", () => {
  it("jumps when the head goes up out of its band", () => {
    expect(play(MOVES.jump())).toEqual(["jump"]);
  });

  it("rolls when the head goes down out of its band, and holds it while the head stays down", () => {
    expect(play(MOVES.duck())).toEqual(["roll", "down", "up"]);
  });

  it("changes track as the head and shoulders move left and right", () => {
    const keys: PoseKey[] = [
      { at: 0, pose: {} },
      { at: 300, pose: { x: 0.3 } },
      { at: 900, pose: { x: 0.3 } },
      { at: 1200, pose: { x: 0.5 } },
      { at: 1800, pose: { x: 0.5 } },
      { at: 2100, pose: { x: 0.7 } },
    ];
    expect(play(keys)).toEqual(["lane -1", "lane 0", "lane 1"]);
  });

  it("does not roll on the bend of a landing, which would slam the runner down in mid air", () => {
    for (const crouch of [0.3, 0.45, 0.6]) expect(play(jump(crouch))).toEqual(["jump"]);
  });

  it("still rolls when the player lands and stays down", () => {
    const keys: PoseKey[] = [...jump(0.6).slice(0, -1), { at: 1500, pose: { crouch: 0.6 } }, { at: 1700, pose: {} }];
    expect(play(keys)).toEqual(["jump", "roll", "down", "up"]);
  });

  it("ignores bobbing on the spot", () => {
    const bob: PoseKey[] = Array.from({ length: 14 }, (_, i) => ({ at: i * 170, pose: { crouch: i % 2 ? 0.2 : 0, x: 0.5 + (i % 3) * 0.02 } }));
    expect(play(bob)).toEqual([]);
  });

  it("gives nothing before calibration, and forgets a held jump on reset", () => {
    const input = new CameraInput();
    expect(input.take(null)).toBeNull();
    input.see({ slot: 1, time: 0, type: "jump", confidence: 1 });
    input.reset();
    const [frame] = readMoves([{ at: 0, pose: {} }], {}, { tail: 0 });
    expect(input.take(frame!.state)!.jump).toBe(false);
  });
});
