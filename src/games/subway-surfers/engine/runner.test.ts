import { describe, expect, it } from "vitest";
import { newRunner, stepRunner, type Contact, type RunnerInput, type RunnerState } from "./runner";
import { BARRIER, JUMP, LANE_WIDTH, RAMP_LENGTH, TRAIN, trainLength, type Lane } from "./tuning";
import type { Obstacle, ObstacleKind } from "./types";

const SPEED = 12;
let nextId = 1;

function thing(kind: ObstacleKind, lane: Lane, z: number, extra: Partial<Obstacle> = {}): Obstacle {
  const length = kind === "train" ? trainLength(1) : kind === "ramp" ? RAMP_LENGTH : BARRIER.depth;
  return { id: nextId++, kind, lane, z, length, drift: 0, style: 0, cars: 1, ...extra };
}

/** Runs a runner through some obstacles, doing `act` at the distances given. */
function play(obstacles: Obstacle[], until: number, act: (s: RunnerState) => Partial<RunnerInput> = () => ({}), jumpHeight: number = JUMP.height) {
  const s = newRunner();
  const contacts: Contact[] = [];
  let maxY = 0;
  while (s.distance < until) {
    const input: RunnerInput = { lane: s.lane, jump: false, duck: false, ducking: false, ...act(s) };
    const result = stepRunner(s, input, obstacles, { speed: SPEED, jumpHeight, fly: null }, 1 / 120);
    if (result.contact) contacts.push(result.contact);
    if (result.contact?.type === "front") break;
    maxY = Math.max(maxY, s.y);
  }
  return { s, contacts, maxY };
}

const once = (at: number, input: Partial<RunnerInput>) => {
  let done = false;
  return (s: RunnerState) => {
    if (done || s.distance < at) return {};
    done = true;
    return input;
  };
};

describe("the runner", () => {
  it("runs into a low barrier standing up", () => {
    const { contacts } = play([thing("low", 0, 20)], 30);
    expect(contacts[0]?.type).toBe("front");
  });

  it("jumps a low barrier, even a little early", () => {
    for (const early of [2, 4, 6]) {
      const { contacts } = play([thing("low", 0, 20)], 30, once(20 - early, { jump: true }));
      expect(contacts).toEqual([]);
    }
  });

  it("jumps as high as the tuning says", () => {
    const { maxY } = play([], 30, once(5, { jump: true }));
    expect(maxY).toBeCloseTo(JUMP.height, 1);
  });

  it("rolls under a high barrier but cannot jump it", () => {
    expect(play([thing("high", 0, 20)], 30, once(17, { duck: true })).contacts).toEqual([]);
    expect(play([thing("high", 0, 20)], 30, once(17, { jump: true })).contacts[0]?.type).toBe("front");
  });

  it("keeps rolling while the player stays down", () => {
    const { s } = play([], 20, (r) => ({ duck: r.distance > 5 && r.distance < 5.2, ducking: r.distance > 5 }));
    expect(s.rollLeft).toBeGreaterThan(0);
  });

  it("slams down and rolls when ducking in the air", () => {
    const { contacts } = play([thing("high", 0, 20)], 30, (r) => (r.distance > 14 && r.distance < 14.2 ? { jump: true } : r.distance > 16 && r.distance < 16.2 ? { duck: true } : {}));
    expect(contacts).toEqual([]);
  });

  it("runs into the front of a train", () => {
    expect(play([thing("train", 0, 20)], 40).contacts[0]?.type).toBe("front");
  });

  it("runs up a ramp onto the roof and drops off the far end", () => {
    const ramp = thing("ramp", 0, 20);
    const train = thing("train", 0, 20 + RAMP_LENGTH);
    let roof = 0;
    const { contacts, s } = play([ramp, train], 20 + RAMP_LENGTH + trainLength(1) + 20, (r) => {
      if (r.y > TRAIN.height - 0.01) roof++;
      return {};
    });
    expect(contacts).toEqual([]);
    expect(roof).toBeGreaterThan(100);
    expect(s.y).toBe(0);
  });

  it("gets onto a roof with jump boots", () => {
    const train = thing("train", 0, 25);
    const { contacts, maxY } = play([train], 34, once(18, { jump: true }), JUMP.bootsHeight);
    expect(contacts).toEqual([]);
    expect(maxY).toBeGreaterThanOrEqual(TRAIN.height);
  });

  it("changes lane, and bumps off a train beside it once instead of passing through", () => {
    const train = thing("train", 1, -5, { length: 30 });
    const { contacts, s } = play([train], 40, () => ({ lane: 1 }));
    expect(contacts.filter((c) => c.type === "side")).toHaveLength(1);
    expect(s.lane).toBe(1);
    expect(s.x).toBeCloseTo(LANE_WIDTH, 5);
  });

  it("steps across one lane at a time", () => {
    const s = newRunner(0, 1);
    const changes: { lane: number; step: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const r = stepRunner(s, { lane: -1, jump: false, duck: false, ducking: false }, [], { speed: SPEED, jumpHeight: JUMP.height, fly: null }, 1 / 120);
      if (r.laneFrom !== null) changes.push({ lane: s.lane, step: i });
    }
    expect(changes.map((c) => c.lane)).toEqual([0, -1]);
    expect(changes[1]!.step - changes[0]!.step).toBeGreaterThan(5);
  });

  it("dodges a train coming the other way", () => {
    const train = thing("train", 0, 40, { drift: 0.5, length: trainLength(2) });
    expect(play([train], 60).contacts[0]?.type).toBe("front");
    const { contacts } = play([train], 60, (r) => ({ lane: r.distance > 20 ? -1 : 0 }));
    expect(contacts).toEqual([]);
  });
});
