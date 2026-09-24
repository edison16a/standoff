import { describe, expect, it } from "vitest";
import { baselineFor, bodiesFrom } from "../sequence";
import type { PoseSpec } from "../synthetic";
import { MOVES, type PoseKey } from "../timeline";
import { MoveReader, type MoveEvent } from "./moves";

/** Joins moves one after another, each shifted to start where the last ended plus a pause. */
function chain(...moves: PoseKey[][]): PoseKey[] {
  const out: PoseKey[] = [];
  let at = 0;
  for (const move of moves) {
    for (const key of move) out.push({ at: at + key.at, pose: key.pose });
    at = out[out.length - 1]!.at + 600;
  }
  return out;
}

function read(reader: MoveReader, keys: PoseKey[], options: { smooth?: boolean; fps?: number } = {}): MoveEvent[] {
  return bodiesFrom(keys, { smooth: true, ...options }).flatMap((body) => reader.update(body, body.time));
}

const kinds = (events: MoveEvent[]) => events.map((e) => (e.type === "punch" ? `punch-${e.hand}` : e.type === "lane" ? `lane${e.lane}` : e.type));

describe("reading a player's moves", () => {
  it("reads a whole routine in order, through the smoothing", () => {
    const base: PoseSpec = { x: 0.28 };
    const reader = new MoveReader(1);
    reader.setBaseline(baselineFor(base));
    const guard = { ...base, left: { guard: 1 }, right: { guard: 1 } };
    const routine = chain(
      MOVES.jump(base),
      MOVES.duck(base),
      MOVES.step(base, 0.12),
      MOVES.step({ ...base, x: 0.4 }, -0.12),
      [{ at: 0, pose: base }, { at: 300, pose: guard }],
      MOVES.punch(base, "right"),
      MOVES.punch(base, "left"),
    );
    const events = read(reader, routine);
    const moves = events.filter((e) => e.type !== "guard");
    expect(kinds(moves)).toEqual(["back", "jump", "land", "duck", "stand", "lane1", "lane0", "punch-right", "punch-left"]);
    // Each punch drops the guard for a moment, the frame before or after it lands.
    const guards = events.flatMap((e) => (e.type === "guard" ? [e.up] : []));
    expect(guards).toEqual([true, false, true, false, true]);
    expect(events.every((e) => e.slot === 1)).toBe(true);
  });

  it("keeps state between events for games that poll every frame", () => {
    const reader = new MoveReader(2);
    reader.setBaseline(baselineFor({}));
    read(reader, [{ at: 0, pose: {} }, { at: 200, pose: { crouch: 0.7 } }, { at: 800, pose: { crouch: 0.7 } }]);
    const state = reader.current;
    expect(state.present).toBe(true);
    expect(state.ducking).toBe(true);
    expect(state.confidence.duck).toBeGreaterThan(0.5);
    expect(state.amounts.drop).toBeGreaterThan(0.3);
    expect(state.slot).toBe(2);
  });

  it("says when a player steps out of view and back, keeping their lane", () => {
    const reader = new MoveReader(1);
    reader.setBaseline(baselineFor({}));
    read(reader, MOVES.step({}, 0.12));
    expect(reader.current.lane).toBe(1);
    const away = reader.update(null, 5000);
    expect(kinds(away)).toEqual(["away"]);
    expect(reader.current.present).toBe(false);
    expect(reader.current.lane).toBe(1);
    const back = read(reader, [{ at: 0, pose: { x: 0.62 } }], { smooth: false }).map((e) => e.type);
    expect(back[0]).toBe("back");
    expect(back).not.toContain("lane");
  });

  it("reads guard, punches and leans before calibration, but not jumps or lanes", () => {
    const reader = new MoveReader(1);
    const events = read(reader, chain(MOVES.jump(), MOVES.step({}, 0.12), [{ at: 0, pose: {} }, { at: 200, pose: { lean: 0.8 } }], MOVES.punch({}, "right")));
    const types = kinds(events);
    expect(types).not.toContain("jump");
    expect(types).not.toContain("lane1");
    expect(types).toContain("lean");
    expect(types).toContain("punch-right");
    expect(reader.current.calibrated).toBe(false);
  });

  it("takes tuning, like five lanes and a higher jump", () => {
    const reader = new MoveReader(1, { lane: { lanes: 5 }, jump: { rise: 2 } });
    reader.setBaseline(baselineFor({}));
    const events = kinds(read(reader, chain(MOVES.jump(), MOVES.step({}, 0.1), MOVES.step({ x: 0.6 }, 0.1))));
    expect(events).not.toContain("jump");
    expect(events.filter((e) => e.startsWith("lane"))).toEqual(["lane1", "lane2"]);
    reader.configure({ jump: { rise: 0.18 } });
    expect(kinds(read(reader, MOVES.jump({ x: 0.7 })))).toContain("jump");
  });

  it("ignores a player walking nearer and further between moves", () => {
    const reader = new MoveReader(1);
    reader.setBaseline(baselineFor({}));
    const walk: PoseKey[] = [
      { at: 0, pose: {} },
      { at: 1200, pose: { height: 0.85, floor: 1.08 } },
      { at: 3000, pose: { height: 0.85, floor: 1.08 } },
      { at: 4200, pose: { height: 0.55, floor: 0.82 } },
      { at: 6000, pose: { height: 0.55, floor: 0.82 } },
    ];
    const events = kinds(read(reader, walk));
    expect(events.filter((e) => e === "jump" || e === "duck")).toEqual([]);
    expect(kinds(read(reader, MOVES.jump({ height: 0.55, floor: 0.82 })))).toContain("jump");
  });
});
