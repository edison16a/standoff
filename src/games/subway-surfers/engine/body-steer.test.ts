import { describe, expect, it } from "vitest";
import { MoveReader, type PoseKey } from "@/games/kit/camera";
import { baselineFor, bodiesFrom } from "@/games/kit/camera/engine/sequence";
import { BodySteer, LEAN_HOLD_MS } from "./body-steer";

/** Plays a movement through the kit's move reader and the steer, as the game does, and lists what the runner is told. */
function play(keys: PoseKey[]) {
  const reader = new MoveReader(1);
  reader.setBaseline(baselineFor({}));
  const steer = new BodySteer();
  const told: { time: number; what: string }[] = [];
  let lane = 0;
  for (const body of bodiesFrom(keys, { smooth: true, tail: 800 })) {
    const t = body.time;
    for (const event of reader.update(body, t)) {
      if (event.type === "jump") told.push({ time: t, what: "jump" });
      if (event.type === "land") steer.landed(t);
      if (event.type === "duck" && steer.duck(t)) told.push({ time: t, what: "duck" });
    }
    const m = reader.current;
    const reading = { lane: m.lane, offset: m.offset, lean: m.lean, ducking: m.ducking };
    if (steer.heldDuck(reading, t)) told.push({ time: t, what: "duck" });
    const next = steer.lane(reading, t);
    if (next !== lane) told.push({ time: t, what: `lane ${next}` });
    lane = next;
  }
  return told;
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

describe("the body steer", () => {
  it("does not read a deep landing as a duck, which would slam the runner down in mid air", () => {
    for (const crouch of [0.3, 0.4, 0.5]) expect(play(jump(crouch)).map((t) => t.what)).toEqual(["jump"]);
  });

  it("still ducks when the player lands and stays down", () => {
    const keys: PoseKey[] = [...jump(0.5).slice(0, -1), { at: 1500, pose: { crouch: 0.6 } }, { at: 1600, pose: {} }];
    expect(play(keys).map((t) => t.what)).toEqual(["jump", "duck"]);
  });

  it("ducks at once with no jump before it", () => {
    const told = play([{ at: 0, pose: {} }, { at: 200, pose: { crouch: 0.6, bow: 0.3 } }, { at: 800, pose: { crouch: 0.6 } }, { at: 1000, pose: {} }]);
    expect(told.map((t) => t.what)).toEqual(["duck"]);
    expect(told[0]!.time).toBeLessThan(300);
  });

  it("changes lane on a step, within 150 ms of crossing", () => {
    const told = play([{ at: 0, pose: {} }, { at: 300, pose: { x: 0.44 } }]);
    expect(told.map((t) => t.what)).toEqual(["lane -1"]);
    expect(told[0]!.time).toBeLessThanOrEqual(350);
  });

  it("changes lane on a lean held in place, and comes back upright", () => {
    const told = play([{ at: 0, pose: {} }, { at: 250, pose: { lean: 0.8 } }, { at: 900, pose: { lean: 0.8 } }, { at: 1100, pose: {} }]);
    expect(told.map((t) => t.what)).toEqual(["lane 1", "lane 0"]);
  });

  it("does not steer on a lean too short to hold", () => {
    const steer = new BodySteer();
    const upright = { lane: 0, offset: 0, lean: 0, ducking: false };
    const leaning = { ...upright, lean: -1 };
    expect(steer.lane(upright, 0)).toBe(0);
    expect(steer.lane(leaning, 10)).toBe(0);
    expect(steer.lane(leaning, 10 + LEAN_HOLD_MS - 1)).toBe(0);
    expect(steer.lane(leaning, 10 + LEAN_HOLD_MS)).toBe(-1);
  });

  it("ignores a lean while the hips are between lanes, as when the head trails a step", () => {
    const steer = new BodySteer();
    const trailing = { lane: 0, offset: -0.5, lean: 1, ducking: false };
    expect(steer.lane(trailing, 0)).toBe(0);
    expect(steer.lane(trailing, 500)).toBe(0);
  });
});
