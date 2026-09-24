import { describe, expect, it } from "vitest";
import { KINDS } from "./kinds";
import { BOARDS, BOOTH, CAMERA, boardTop, type Vec3 } from "./layout";
import { probe, type Ray } from "./raycast";
import { Round } from "./round";
import { COOLDOWN_S, COUNTDOWN_S } from "./rules";
import type { Target } from "./target";

const eye: Vec3 = { ...CAMERA.position };

/** A ray from the camera straight through a point in the booth. */
function rayTo(point: Vec3): Ray {
  return { origin: eye, dir: { x: point.x - eye.x, y: point.y - eye.y, z: point.z - eye.z } };
}

function target(partial: Partial<Target>): Target {
  return { id: 1, kind: "duck", lane: "back", x: 0, y: 1, z: -1.45, vx: 0, facing: 1, born: 0, raise: 1, lowerAt: Infinity, hit: null, ...partial };
}

/** The middle of a target's first hit shape, in the world. */
function centreOf(t: Target): Vec3 {
  const shape = KINDS[t.kind].shapes[0]!;
  const scale = KINDS[t.kind].scale;
  return { x: t.x + shape.x * scale * t.facing, y: t.y + shape.y * scale, z: t.z };
}

describe("probe", () => {
  it("hits a duck through the middle of its body", () => {
    const duck = target({ y: 1.2 });
    expect(probe([duck], rayTo(centreOf(duck))).target).toBe(duck);
  });

  it("is stopped by the wave board in front of a duck", () => {
    const duck = target({ y: BOARDS[1]!.baseY - 0.5 });
    const found = probe([duck], rayTo({ x: 0, y: duck.y + 0.1, z: duck.z }));
    expect(found.target).toBeNull();
    expect(found.point.z).toBeCloseTo(BOARDS[1]!.z);
  });

  it("gives the nearer of two overlapping targets", () => {
    const back = target({ id: 1, z: -2.55, lane: "pop", kind: "bullseye", y: 1.62 });
    const front = target({ id: 2, z: -1.45, y: 1.9 });
    const aim = centreOf(front);
    expect(probe([back, front], rayTo(aim)).target).toBe(front);
  });

  it("scores the bull only near the centre of a bullseye", () => {
    const board = target({ kind: "bullseye", lane: "pop", z: -2.55, y: 1.62 });
    const middle = centreOf(board);
    expect(probe([board], rayTo(middle)).bull).toBe(true);
    expect(probe([board], rayTo({ ...middle, x: middle.x + 0.25 })).bull).toBe(false);
  });

  it("lands on the back wall when nothing is in the way", () => {
    const found = probe([], rayTo({ x: 0, y: 3.8, z: BOOTH.wallZ }));
    expect(found.target).toBeNull();
    expect(found.point.z).toBe(BOOTH.wallZ);
  });

  it("ignores targets that were already hit", () => {
    const duck = target({ y: 1.2, hit: { at: 0, by: 1, point: eye, points: 10, bull: false } });
    expect(probe([duck], rayTo(centreOf(duck))).target).toBeNull();
  });

  it("keeps the wave tops inside their band", () => {
    for (const board of BOARDS) {
      for (let x = -5; x <= 5; x += 0.25) expect(Math.abs(boardTop(board, x) - board.baseY)).toBeLessThanOrEqual(board.amp * 1.31);
    }
  });
});

describe("round", () => {
  it("counts down, plays for its length, then ends", () => {
    const round = new Round({ seats: [1], seconds: 20, seed: 7 });
    const types: string[] = [];
    for (let i = 0; i < 60 * 24; i++) types.push(...round.tick(1 / 60).map((e) => e.type));
    expect(types.filter((t) => t === "count")).toHaveLength(3);
    expect(types.indexOf("go")).toBeLessThan(types.indexOf("over"));
    expect(types.filter((t) => t === "final")).toHaveLength(5);
    expect(round.phase).toBe("over");
    expect(round.timeLeft).toBe(0);
  });

  it("ignores shots before the start and while pumping", () => {
    const round = new Round({ seats: [1], seconds: 20, seed: 1 });
    const ray = rayTo({ x: 0, y: 3.8, z: BOOTH.wallZ });
    expect(round.shoot(1, ray)).toBeNull();
    round.tick(COUNTDOWN_S + 0.01);
    expect(round.shoot(1, ray)).not.toBeNull();
    expect(round.shoot(1, ray)).toBeNull();
    round.tick(COOLDOWN_S);
    expect(round.shoot(1, ray)).not.toBeNull();
    expect(round.tally(1)).toMatchObject({ shots: 2, hits: 0, score: 0 });
  });

  it("refuses shots from players who are not in the round", () => {
    const round = new Round({ seats: [1], seconds: 20, seed: 1 });
    round.tick(COUNTDOWN_S + 0.01);
    expect(round.shoot(2, rayTo({ x: 0, y: 2, z: -3 }))).toBeNull();
  });

  it("scores a hit once and knocks the target down", () => {
    const round = new Round({ seats: [1, 2], seconds: 20, seed: 3 });
    round.tick(COUNTDOWN_S + 0.01);
    const duck = target({ id: 999, y: 1.2 });
    round.targets.push(duck);
    const shot = round.shoot(1, rayTo(centreOf(duck)));
    expect(shot).toMatchObject({ target: duck, points: KINDS.duck.points });
    expect(duck.hit?.by).toBe(1);
    // The second player's shot passes through where the duck was.
    const second = round.shoot(2, rayTo(centreOf(duck)));
    expect(second?.target).not.toBe(duck);
    expect(round.tally(1)?.score).toBe(KINDS.duck.points);
  });

  it("reports when a knocked down target lands", () => {
    const round = new Round({ seats: [1], seconds: 20, seed: 3 });
    round.tick(COUNTDOWN_S + 0.01);
    const duck = target({ id: 999, y: 1.2, x: 0 });
    round.targets.push(duck);
    round.shoot(1, rayTo(centreOf(duck)));
    const landed = Array.from({ length: 40 }, () => round.tick(1 / 60)).flat().filter((e) => e.type === "landed");
    expect(landed).toHaveLength(1);
  });

  it("keeps both duck lanes busy and never overlaps pop ups", () => {
    const round = new Round({ seats: [1], seconds: 45, seed: 11 });
    for (let i = 0; i < 60 * 40; i++) {
      round.tick(1 / 60);
      const pops = round.targets.filter((t) => t.lane === "pop" && !t.hit);
      expect(pops.length).toBeLessThanOrEqual(3);
      expect(round.targets.filter((t) => t.lane === "back").length).toBeGreaterThan(1);
      expect(round.targets.filter((t) => t.lane === "front").length).toBeGreaterThan(1);
    }
  });

  it("replays the same round from the same seed", () => {
    const a = new Round({ seats: [1], seconds: 20, seed: 42 });
    const b = new Round({ seats: [1], seconds: 20, seed: 42 });
    for (let i = 0; i < 600; i++) {
      a.tick(1 / 60);
      b.tick(1 / 60);
    }
    expect(a.targets.map((t) => [t.kind, t.x.toFixed(3)])).toEqual(b.targets.map((t) => [t.kind, t.x.toFixed(3)]));
  });

  it("lets anyone shoot in practice without keeping score", () => {
    const round = new Round({ seats: [], seconds: Infinity, seed: 5, practice: true });
    const duck = target({ id: 999, y: 1.2 });
    round.targets.push(duck);
    const shot = round.shoot(3, rayTo(centreOf(duck)));
    expect(shot?.target).toBe(duck);
    expect(shot?.points).toBe(0);
    expect(duck.hit?.by).toBeNull();
  });
});
