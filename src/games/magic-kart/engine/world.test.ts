import { describe, expect, it } from "vitest";
import { TRACKS } from "../tracks";
import { seeded } from "./random";
import { STEP } from "./tuning";
import { RaceWorld } from "./world";

const GRID = [
  { character: "blaze", seat: null },
  { character: "pip", seat: null },
  { character: "nova", seat: null },
  { character: "mochi", seat: null },
] as const;

describe("a whole race", () => {
  // A whole race takes a few seconds, more on a busy machine, hence the long timeout.
  it.each(TRACKS.map((def) => [def.name, def] as const))("computer karts finish two laps of %s", (_, def) => {
    const world = new RaceWorld(def, GRID, seeded(42));
    const counts: Record<string, number> = {};
    for (let i = 0; i < 60 * 240 && world.phase !== "over"; i++) {
      world.step(STEP);
      for (const e of world.drainEvents()) counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    expect(world.phase).toBe("over");
    expect(world.karts.filter((k) => k.race.finished).length).toBeGreaterThanOrEqual(3);
    expect(counts.countdown).toBe(3);
    expect(counts.pickup).toBeGreaterThan(4);
    // A clean computer race should almost never need a kart put back.
    expect(counts.respawn ?? 0).toBeLessThan(6);
    // They drive on the same model as a player, drifting through the bends for turbos.
    expect(counts.drift).toBeGreaterThan(8);
    expect(counts.fell ?? 0).toBeLessThan(3);
  }, 30_000);
});

describe("the countdown", () => {
  it("holds everyone still, then starts on the signal", () => {
    const world = new RaceWorld(TRACKS[0]!, GRID, seeded(1));
    const start = { x: world.karts[0]!.x, z: world.karts[0]!.z };
    for (let i = 0; i < 60 * 3; i++) world.step(STEP);
    expect(world.phase).toBe("countdown");
    expect(world.karts[0]!.x).toBe(start.x);
    for (let i = 0; i < 60; i++) world.step(STEP);
    expect(world.phase).toBe("racing");
    expect(world.drainEvents().some((e) => e.type === "go")).toBe(true);
  });

  it("puts a player whose phone dropped on autopilot, and hands back control on return", () => {
    const world = new RaceWorld(TRACKS[0]!, [GRID[0], { character: "pip", seat: 1 }], seeded(2));
    const player = world.karts[1]!;
    expect(player.autopilot).toBe(false);
    world.setAutopilot(1, true);
    for (let i = 0; i < 60 * 8; i++) world.step(STEP);
    expect(player.race.progress).toBeGreaterThan(40);
    world.setAutopilot(1, false);
    expect(player.autopilot).toBe(false);
  });
});
