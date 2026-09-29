import { describe, expect, it } from "vitest";
import { newRunner, stepRunner, type Contact, type RunnerInput, type RunnerState } from "./runner";
import { BARRIER, JUMP, laneX, RAMP_LENGTH, RUNNER, STEP_S, TRAIN, trainLength, type Lane } from "./tuning";
import type { Obstacle, ObstacleKind } from "./types";

const SPEED = 14;
let nextId = 1;

function thing(kind: ObstacleKind, lane: Lane, z: number, cars = 1): Obstacle {
  const length = kind === "train" ? trainLength(cars) : kind === "ramp" ? RAMP_LENGTH : BARRIER.depth;
  return { id: nextId++, kind, lane, z, length, drift: 0, style: 0, cars };
}

/** Runs until `until` metres or a crash, asking for `act` each step. */
function play(s: RunnerState, near: Obstacle[], until: number, act: (s: RunnerState) => Partial<RunnerInput>) {
  const contacts: Contact[] = [];
  let top = 0;
  while (s.distance < until) {
    const input: RunnerInput = { lane: s.lane, jump: false, duck: false, ducking: false, ...act(s) };
    const result = stepRunner(s, input, near, { speed: SPEED, jumpHeight: JUMP.height, fly: null }, STEP_S);
    top = Math.max(top, s.y);
    if (result.contact) contacts.push(result.contact);
    if (result.contact?.type === "front") break;
  }
  return { contacts, top };
}

/** A runner partway through a lane change, `gap` metres short of touching an obstacle's front. */
function midChange(x: number, lane: Lane, front: number): RunnerState {
  const s = newRunner(front - RUNNER.halfDepth - 0.05, lane);
  s.x = x;
  return s;
}

function step(s: RunnerState, near: Obstacle[]): Contact | null {
  return stepRunner(s, { lane: s.lane, jump: false, duck: false, ducking: false }, near, { speed: SPEED, jumpHeight: JUMP.height, fly: null }, STEP_S).contact;
}

describe("clipping a corner", () => {
  it("is a stumble that bounces the runner back, when a lane change comes too late", () => {
    // Stepping from the middle into the left lane just as a barrier there arrives.
    const s = midChange(-1.2, -1, 20);
    expect(step(s, [thing("low", -1, 20)])?.type).toBe("side");
    expect(s.lane).toBe(0);
    expect(s.x).toBeGreaterThan(laneX(-1) + 1.05);
  });

  it("is still a crash once the whole body is in the lane", () => {
    const s = midChange(-2.2, -1, 20);
    expect(step(s, [thing("low", -1, 20)])?.type).toBe("front");
  });

  it("bounces the runner on the way, off the corner of a train they leave too late", () => {
    const s = midChange(1.2, 1, 20);
    expect(step(s, [thing("train", 0, 20)])?.type).toBe("side");
    expect(s.lane).toBe(1);
    expect(s.x).toBeGreaterThan(laneX(0) + TRAIN.width / 2);
  });

  it("is a crash for a runner standing square in front of it", () => {
    const s = midChange(0, 0, 20);
    expect(step(s, [thing("train", 0, 20)])?.type).toBe("front");
  });
});

describe("jumping", () => {
  it("still works a moment after running off the end of a roof", () => {
    const train = thing("train", 0, -10);
    const s = newRunner(0, 0);
    s.y = TRAIN.height;
    const end = train.z + train.length;
    const { top } = play(s, [train], end + 8, (r) => ({ jump: r.distance > end + RUNNER.halfDepth + SPEED * 0.05 && r.distance < end + RUNNER.halfDepth + SPEED * 0.06 }));
    expect(top).toBeGreaterThan(TRAIN.height + JUMP.height * 0.8);
  });

  it("lands on the roof when jumping halfway up a ramp", () => {
    const ramp = thing("ramp", 0, 20);
    const train = thing("train", 0, 20 + RAMP_LENGTH, 2);
    const s = newRunner();
    const { contacts } = play(s, [ramp, train], 20 + RAMP_LENGTH + 12, (r) => ({ jump: r.distance > 23 && r.distance < 23.2 }));
    expect(contacts).toEqual([]);
    expect(s.y).toBeCloseTo(TRAIN.height, 5);
  });

  it("drops fast when ducking in the air, and rolls on landing", () => {
    const s = newRunner();
    let air = 0;
    let rolled = false;
    let asked = false;
    for (let t = 0; t < 1.2; t += STEP_S) {
      const duck: boolean = !asked && s.y > 1.2;
      asked ||= duck;
      const r = stepRunner(s, { lane: 0, jump: t === 0, duck, ducking: duck }, [], { speed: SPEED, jumpHeight: JUMP.height, fly: null }, STEP_S);
      if (!s.grounded) air += STEP_S;
      rolled ||= r.rolled && asked;
    }
    expect(air).toBeLessThan(0.45);
    expect(rolled).toBe(true);
  });
});

