import { describe, expect, it } from "vitest";
import type { TrackDef } from "../tracks/types";
import type { BotView } from "./bot";
import { boxLane, wantsItem } from "./bot-items";
import type { ItemKind } from "./items";
import { createKart, type Kart } from "./kart";
import { buildCubes } from "./pickups";
import { OVAL } from "./test-track";
import { Track } from "./track";

/** The test oval, its one row of boxes with a double out on the right. */
const DEF: TrackDef = { ...OVAL, doubles: [{ row: 0, place: 3 }] };
const track = new Track(DEF);
const cubes = buildCubes(track);
const row = cubes[0]!.s;

/** A lone kart this far before the row of boxes, holding these items, roulettes stopped. */
function setup(before: number, items: ItemKind[], d = 0) {
  const kart = createKart(0, "blaze", null, track, track.wrap(row - before), d);
  kart.race.progress = 500;
  for (const kind of items) kart.items.push({ kind, readyAt: 0 });
  const view: BotView = { track, karts: [kart], cubes, obstacles: [], chased: false };
  return { kart, view };
}

function withRival(kart: Kart, view: BotView, gap: number): BotView {
  const rival = createKart(1, "pip", null, track, track.wrap(kart.loc.s + gap), 0);
  rival.race.progress = kart.race.progress + gap;
  return { ...view, karts: [kart, rival] };
}

describe("a computer driver and its boxes", () => {
  it("steers for the nearest box while it has room", () => {
    const { kart, view } = setup(25, ["orb"], -1);
    expect(boxLane(kart, view)).toBeCloseTo(cubes[1]!.d);
  });

  it("leans towards a double box when its hands are empty", () => {
    const { kart, view } = setup(25, [], 2.5);
    // The single in the next place over is nearer across the road, but the double is worth two.
    expect(Math.abs(cubes[2]!.d - 2.5)).toBeLessThan(Math.abs(cubes[3]!.d - 2.5));
    expect(boxLane(kart, view)).toBeCloseTo(cubes[3]!.d);
  });

  it("does not chase boxes with both hands full", () => {
    const { kart, view } = setup(25, ["orb", "ice"]);
    expect(boxLane(kart, view)).toBeNull();
  });

  it("ignores boxes that are taken, behind, or too far off", () => {
    const behind = setup(-5, []);
    expect(boxLane(behind.kart, behind.view)).toBeNull();
    const far = setup(80, []);
    expect(boxLane(far.kart, far.view)).toBeNull();
  });
});

describe("a computer driver playing two items", () => {
  it("keeps an orb with nobody to throw it at", () => {
    const { kart, view } = setup(80, ["orb"]);
    expect(wantsItem(kart, view)).toBe(false);
  });

  it("throws the orb when a kart is close ahead", () => {
    const { kart, view } = setup(80, ["orb"]);
    expect(wantsItem(kart, withRival(kart, view, 30))).toBe(true);
  });

  it("fires the front item to make room just before a box when both hands are full", () => {
    const { kart, view } = setup(20, ["orb", "nitro"]);
    expect(wantsItem(kart, view)).toBe(true);
    const roomy = setup(20, ["orb"]);
    expect(wantsItem(roomy.kart, roomy.view)).toBe(false);
  });

  it("never wastes a shield that is already up to make room", () => {
    const { kart, view } = setup(20, ["shield", "orb"]);
    kart.timers.shield = 5;
    expect(wantsItem(kart, view)).toBe(false);
  });

  it("fires the front item to bring a queued shield forward when a throw is chasing", () => {
    const { kart, view } = setup(80, ["orb", "shield"]);
    expect(wantsItem(kart, view)).toBe(false);
    expect(wantsItem(kart, { ...view, chased: true })).toBe(true);
  });

  it("sends the leader's ice back at the kart behind", () => {
    const { kart, view } = setup(80, ["ice"]);
    expect(wantsItem(kart, view)).toBe(false);
    expect(wantsItem(kart, withRival(kart, view, -25))).toBe(true);
  });
});
