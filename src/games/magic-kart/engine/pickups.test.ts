import { describe, expect, it } from "vitest";
import { TRACKS } from "../tracks";
import type { TrackDef } from "../tracks/types";
import type { RaceEvent } from "./events";
import { stow } from "./item-queue";
import { createKart, type Kart } from "./kart";
import { buildCubes, collectCubes, STACK_GAP, type Cube } from "./pickups";
import { OVAL } from "./test-track";
import { Track } from "./track";
import { RACE } from "./tuning";

/** The test oval with a double box in the third place of its row and one over a sky row. */
const DEF: TrackDef = { ...OVAL, doubles: [{ row: 0, place: 2 }], skyRows: [{ at: 0.6, height: 5, double: 0 }] };
const track = new Track(DEF);

function setup() {
  const cubes = buildCubes(track);
  const kart = createKart(0, "blaze", 1, track, 10, 0);
  const events: RaceEvent[] = [];
  return { cubes, kart, events, emit: (e: RaceEvent) => events.push(e) };
}

/** Parks the kart in the box, its wheels on the road below it, or `lift` metres higher. */
function driveInto(kart: Kart, cube: Cube, lift = 0): void {
  kart.x = cube.x;
  kart.z = cube.z;
  kart.y = cube.y - 1.1 + lift;
}

/** A random source that counts how often it is asked. */
function counting(value = 0.5) {
  const fn = () => {
    fn.calls += 1;
    return value;
  };
  fn.calls = 0;
  return fn;
}

describe("double boxes", () => {
  it("stand in the places the map gives them, the rest stay single", () => {
    const { cubes } = setup();
    expect(cubes).toHaveLength(6);
    expect(cubes.map((c) => c.count)).toEqual([1, 1, 2, 1, 2, 1]);
  });

  it("are on every map, on the ground and over the glide jump, with single boxes kept", () => {
    for (const def of TRACKS) {
      const cubes = buildCubes(new Track(def));
      const ground = cubes.slice(0, def.cubeRows.length * 4);
      expect(ground.filter((c) => c.count === 2).length, def.id).toBeGreaterThanOrEqual(2);
      expect(ground.filter((c) => c.count === 1).length, def.id).toBeGreaterThanOrEqual(def.cubeRows.length * 3);
      expect(cubes.slice(ground.length).some((c) => c.count === 2), def.id).toBe(true);
      for (const b of def.doubles) {
        expect(b.row).toBeLessThan(def.cubeRows.length);
        expect(b.place).toBeGreaterThanOrEqual(0);
        expect(b.place).toBeLessThan(4);
      }
    }
  });
});

describe("driving through boxes", () => {
  it("gives one power up from a single cube, rolled once", () => {
    const { cubes, kart, events, emit } = setup();
    const random = counting();
    driveInto(kart, cubes[0]!);
    collectCubes(cubes, [kart], 3, random, emit);
    expect(kart.items).toHaveLength(1);
    expect(random.calls).toBe(1);
    expect(cubes[0]!.respawnAt).toBe(3 + RACE.cubeRespawn);
    expect(events).toEqual([{ type: "pickup", kart: 0, items: [kart.items[0]!.kind], cube: 0 }]);
  });

  it("gives two from a double box, each rolled on its own", () => {
    const { cubes, kart, events, emit } = setup();
    const rolls = [0.05, 0.95];
    const random = () => rolls.shift() ?? 0.5;
    driveInto(kart, cubes[2]!);
    collectCubes(cubes, [kart], 3, random, emit);
    expect(kart.items).toHaveLength(2);
    expect(kart.items[0]!.kind).not.toBe(kart.items[1]!.kind);
    expect(events[0]).toMatchObject({ type: "pickup", cube: 2, items: kart.items.map((i) => i.kind) });
    expect(cubes[2]!.respawnAt).toBeGreaterThan(0);
  });

  it("fills only the free place from a double box when one item is already held", () => {
    const { cubes, kart, emit } = setup();
    stow(kart, ["shield"], 0);
    const random = counting();
    driveInto(kart, cubes[2]!);
    collectCubes(cubes, [kart], 3, random, emit);
    expect(kart.items.map((i) => i.kind)[0]).toBe("shield");
    expect(kart.items).toHaveLength(2);
    expect(random.calls).toBe(1);
    expect(cubes[2]!.respawnAt).toBeGreaterThan(0);
  });

  it("leaves the box whole for the next kart when both hands are full", () => {
    const { cubes, kart, events, emit } = setup();
    stow(kart, ["orb", "nitro"], 0);
    const next = createKart(1, "pip", null, track, 10, 0);
    for (const box of [cubes[0]!, cubes[2]!]) {
      driveInto(kart, box);
      collectCubes(cubes, [kart], 3, Math.random, emit);
      expect(box.respawnAt).toBe(0);
    }
    expect(events).toEqual([]);
    expect(kart.items.map((i) => i.kind)).toEqual(["orb", "nitro"]);
    driveInto(next, cubes[2]!);
    collectCubes(cubes, [kart, next], 3, Math.random, emit);
    expect(next.items).toHaveLength(2);
  });

  it("reaches as high as the top cube of a double box", () => {
    const { cubes, kart, emit } = setup();
    driveInto(kart, cubes[1]!, STACK_GAP + 2);
    collectCubes(cubes, [kart], 3, Math.random, emit);
    expect(kart.items).toHaveLength(0);
    driveInto(kart, cubes[2]!, STACK_GAP + 2);
    collectCubes(cubes, [kart], 3, Math.random, emit);
    expect(kart.items).toHaveLength(2);
  });

  it("comes back after a while, and is ignored by a kart that has finished", () => {
    const { cubes, kart, emit } = setup();
    driveInto(kart, cubes[0]!);
    kart.race.finished = true;
    collectCubes(cubes, [kart], 3, Math.random, emit);
    expect(kart.items).toHaveLength(0);
    kart.race.finished = false;
    collectCubes(cubes, [kart], 3, Math.random, emit);
    kart.items.length = 0;
    collectCubes(cubes, [kart], 3 + RACE.cubeRespawn - 0.1, Math.random, emit);
    expect(kart.items).toHaveLength(0);
    collectCubes(cubes, [kart], 3 + RACE.cubeRespawn, Math.random, emit);
    collectCubes(cubes, [kart], 3 + RACE.cubeRespawn + 0.1, Math.random, emit);
    expect(kart.items).toHaveLength(1);
  });
});
