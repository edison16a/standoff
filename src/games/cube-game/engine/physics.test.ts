import { describe, expect, it } from "vitest";
import { LevelBuilder } from "./builder";
import { startState } from "./player";
import { step } from "./physics";
import { trace } from "./trace";
import { STEP } from "./tuning";
import { World } from "./world";

const INFO = { id: "test", name: "Test", difficulty: 1, bpm: 120, theme: "test" } as const;

function flat(author: (b: LevelBuilder) => void = () => undefined, mode: "cube" | "ufo" | "ball" = "cube") {
  const b = new LevelBuilder(INFO, 10, mode);
  author(b);
  if (mode !== "cube") b.portal(0, mode);
  return b.end(40).build();
}

const seconds = (level: ReturnType<typeof flat>, beats: number[]) => beats.map((beat) => (beat * 60) / level.bpm);

describe("the cube", () => {
  it("runs a flat level to the finish", () => {
    const run = trace(flat(), []);
    expect(run.finished).toBe(true);
    expect(run.points.every((p) => Math.abs(p.y - 0.46) < 1e-6)).toBe(true);
  });

  it("finishes on the beat the level says", () => {
    const level = flat();
    const run = trace(level, []);
    expect(run.points.at(-1)!.t).toBeCloseTo((40 * 60) / 120, 1);
  });

  it("dies on a spike unless it jumps on the beat", () => {
    const level = flat((b) => b.spikes(b.apex(8)));
    expect(trace(level, []).death).not.toBeNull();
    expect(trace(level, seconds(level, [8])).finished).toBe(true);
  });

  it("forgives a jump a little early or late over one spike", () => {
    const level = flat((b) => b.spikes(b.apex(8)));
    for (const shift of [-0.12, 0.12]) expect(trace(level, seconds(level, [8]).map((t) => t + shift)).finished).toBe(true);
  });

  it("jumps about two and a half blocks high and lands flat", () => {
    const level = flat();
    const run = trace(level, [1]);
    const high = Math.max(...run.points.map((p) => p.y));
    expect(high - 0.46).toBeGreaterThan(2.2);
    expect(high - 0.46).toBeLessThan(2.6);
    const world = new World(level);
    const p = startState(level);
    step(p, world, STEP, true);
    for (let i = 0; i < 240; i++) step(p, world, STEP, false);
    const quarter = Math.PI / 2;
    expect(Math.abs(p.angle - Math.round(p.angle / quarter) * quarter)).toBeLessThan(0.01);
  });

  it("lands on a block, and dies running into its side", () => {
    const level = flat((b) => b.block(b.apex(8), 0, 6, 1));
    expect(trace(level, seconds(level, [8])).finished).toBe(true);
    expect(trace(level, []).death).not.toBeNull();
  });

  it("keeps a jump pressed just before landing", () => {
    const level = flat((b) => b.spikes(b.apex(9)));
    const [first, second] = seconds(level, [8, 9]);
    // The second press comes while still in the air from the first.
    expect(trace(level, [first!, second! - 0.05]).finished).toBe(true);
  });

  it("is launched by a pad without jumping", () => {
    const level = flat((b) => b.pad(b.x(8)).spikes(b.x(8) + 3, 3));
    expect(trace(level, []).finished).toBe(true);
  });
});

describe("the UFO", () => {
  it("falls without flaps and rises with them", () => {
    const level = flat(() => undefined, "ufo");
    const still = trace(level, []);
    expect(still.points.at(-1)!.y).toBeCloseTo(0.46, 2);
    const flaps = trace(level, seconds(level, [2, 3, 4, 5]));
    expect(Math.max(...flaps.points.map((p) => p.y))).toBeGreaterThan(4);
  });

  it("slides along its ceiling instead of dying", () => {
    const level = flat(() => undefined, "ufo");
    const run = trace(level, seconds(level, Array.from({ length: 30 }, (_, i) => 1 + i * 0.5)));
    expect(run.finished).toBe(true);
    expect(Math.max(...run.points.map((p) => p.y))).toBeLessThanOrEqual(9 - 0.46 + 1e-6);
  });
});

describe("the ball", () => {
  it("flips to the ceiling and back", () => {
    const level = flat(() => undefined, "ball");
    const run = trace(level, seconds(level, [4, 8]));
    const at = (beat: number) => run.points.find((p) => p.t >= (beat * 60) / 120)!;
    expect(at(6).gravity).toBe(-1);
    expect(at(6).y).toBeCloseTo(6 - 0.46, 2);
    expect(at(10).gravity).toBe(1);
    expect(at(10).y).toBeCloseTo(0.46, 2);
  });

  it("cannot flip again in mid air", () => {
    const level = flat(() => undefined, "ball");
    const run = trace(level, seconds(level, [4, 4.25]));
    expect(run.final.gravity).toBe(-1);
  });
});
