import { describe, expect, it } from "vitest";
import { TRACKS } from "../tracks";
import { lapsDone } from "./race";
import { seeded } from "./random";
import { finishInPlace, jumpToFinalLap } from "./shortcuts";
import { RACE, STEP } from "./tuning";
import { RaceWorld } from "./world";

const GRID = [
  { character: "blaze", seat: 1 },
  { character: "pip", seat: null },
  { character: "nova", seat: null },
] as const;

/** A race a few seconds past the start. */
function racing(): RaceWorld {
  const world = new RaceWorld(TRACKS[0]!, GRID, seeded(7));
  for (let i = 0; i < 60 * 8; i++) world.step(STEP);
  expect(world.phase).toBe("racing");
  return world;
}

describe("admin shortcuts", () => {
  it("puts everyone on the final lap and keeps the order", () => {
    const world = racing();
    const order = world.standings.map((k) => k.id);
    jumpToFinalLap(world);
    world.step(STEP);
    for (const kart of world.karts) expect(lapsDone(kart)).toBe(RACE.laps - 1);
    expect(world.standings.map((k) => k.id)).toEqual(order);
    expect(world.phase).toBe("racing");
  });

  it("does nothing before the start", () => {
    const world = new RaceWorld(TRACKS[0]!, GRID, seeded(7));
    jumpToFinalLap(world);
    finishInPlace(world);
    expect(world.karts.every((k) => k.race.checkpoints === 0 && !k.race.finished)).toBe(true);
  });

  it("finishes everyone in the current order and ends the race", () => {
    const world = racing();
    const order = world.standings.map((k) => k.id);
    finishInPlace(world);
    world.step(STEP);
    expect(world.phase).toBe("over");
    expect(world.drainEvents().some((e) => e.type === "raceOver")).toBe(true);
    expect([...world.karts].sort((a, b) => a.race.place - b.race.place).map((k) => k.id)).toEqual(order);
    expect(world.karts.every((k) => k.race.finishTime !== null)).toBe(true);
  });
});
