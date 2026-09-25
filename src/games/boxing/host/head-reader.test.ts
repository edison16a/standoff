import { describe, expect, it } from "vitest";
import type { PoseKey, PoseSpec } from "@/games/kit/camera";
import { readMoves } from "@/games/kit/camera/engine/sequence";
import { fighting, ofType, run } from "../engine/test-helpers";
import { RULES } from "../engine/rules";
import { HeadReader } from "./head-reader";
import { defenseFrom } from "./player-input";

const GUARD: PoseSpec = { left: { guard: 1 }, right: { guard: 1 } };

/** Each camera frame of a movement, as the boxer's head spot. */
function heads(keys: PoseKey[], options: { fps?: number } = {}) {
  const reader = new HeadReader();
  return readMoves(keys, GUARD, { smooth: true, ...options }).map(({ body, state }) => ({ time: body.time, body, state, head: { ...reader.update(state, body.time) } }));
}

const at = <T extends { time: number }>(frames: T[], time: number) => frames.find((frame) => frame.time >= time)!;
const move = (pose: PoseSpec, hold = 600): PoseKey[] => [
  { at: 0, pose: GUARD },
  { at: 500, pose: GUARD },
  { at: 650, pose: { ...GUARD, ...pose } },
  { at: 650 + hold, pose: { ...GUARD, ...pose } },
  { at: 850 + hold, pose: GUARD },
];

describe("the boxer's head from the camera", () => {
  it("stays in the middle while the player stands still", () => {
    const frames = heads(move({}));
    expect(frames.every((f) => Math.abs(f.head.x) < 0.02 && Math.abs(f.head.y) < 0.02)).toBe(true);
  });

  it("slips out of a punch's path when the whole upper body shifts sideways, and comes back", () => {
    const frames = heads(move({ x: 0.6 }));
    expect(Math.abs(at(frames, 900).head.x)).toBeGreaterThan(RULES.missRadius);
    expect(Math.abs(frames[frames.length - 1]!.head.x)).toBeLessThan(0.05);
  });

  it("moves to the boxer's own side: the player's right is the boxer's right, and a lean either way", () => {
    expect(at(heads(move({ lean: 0.6 })), 900).head.x).toBeGreaterThan(0.1);
    expect(at(heads(move({ lean: -0.6 })), 900).head.x).toBeLessThan(-0.1);
  });

  it("ducks under a punch's path as the head dips under its line", () => {
    const frames = heads(move({ crouch: 0.6, bow: 0.2 }));
    expect(at(frames, 900).head.y).toBeLessThan(-RULES.missRadius);
    expect(Math.abs(at(frames, 900).head.x)).toBeLessThan(0.1);
  });

  it("keeps up with a quick dodge, and still sees one on a machine tracking a few frames a second", () => {
    const quick: PoseKey[] = [
      { at: 0, pose: GUARD },
      { at: 500, pose: GUARD },
      { at: 600, pose: { ...GUARD, x: 0.62 } },
      { at: 800, pose: { ...GUARD, x: 0.62 } },
    ];
    expect(Math.abs(at(heads(quick), 690).head.x)).toBeGreaterThan(RULES.missRadius);
    expect(heads(quick, { fps: 4 }).some((f) => Math.abs(f.head.x) > RULES.missRadius)).toBe(true);
  });

  it("drifts back to the middle for a player who steps to a new spot and stays", () => {
    const frames = heads(move({ x: 0.6 }, 9000));
    expect(Math.abs(at(frames, 900).head.x)).toBeGreaterThan(0.2);
    expect(Math.abs(at(frames, 9000).head.x)).toBeLessThan(0.05);
  });
});

/** The computer winds up a cross at the player, whose camera frames play meanwhile. */
function crossAt(keys: PoseKey[]) {
  const frames = heads(keys);
  const match = fighting();
  let t = 0;
  const events = [];
  for (const frame of frames) {
    if (frame.time >= 400 && t < 400) match.throwPunch(1, "right", "cross", 1, 300);
    match.setInput(0, defenseFrom(frame.state, frame.body, frame.head));
    events.push(...run(match, frame.time - t, 5));
    t = frame.time;
  }
  return events;
}

describe("a real dodge against a punch already on its way", () => {
  it("makes a head punch miss when the player's head moves out of its path before impact", () => {
    // The player slips as the glove leaves.
    const events = crossAt(move({ x: 0.62 }));
    expect(ofType(events, "throw")).toHaveLength(1);
    expect(ofType(events, "hit")).toHaveLength(0);
    expect(ofType(events, "miss")[0]).toMatchObject({ target: 0, dodge: "slip" });
  });

  it("finds a player who stays where they are, whose guard then stops it", () => {
    const events = crossAt(move({}));
    expect(ofType(events, "miss")).toHaveLength(0);
    expect(ofType(events, "block")).toHaveLength(1);
  });
});
