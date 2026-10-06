import { describe, expect, it } from "vitest";
import type { RaceEvent } from "./events";
import { fireItem, strike, tickTimers } from "./item-use";
import { ITEM_KINDS, rollItem, type ItemKind } from "./items";
import { createKart, type Kart } from "./kart";
import { nearestAhead, stepProjectile } from "./projectiles";
import { OVAL } from "./test-track";
import { Track } from "./track";
import { EFFECTS, STEP } from "./tuning";

const track = new Track(OVAL);

/** Puts power ups straight in hand, roulettes already stopped. */
function give(kart: Kart, ...kinds: ItemKind[]): void {
  for (const kind of kinds) kart.items.push({ kind, readyAt: 0 });
}

function tally(place: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    const item = rollItem(place, i / 1000);
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}

describe("item rolls", () => {
  it("can give every item", () => {
    const seen = new Set([0, 0.5, 1].flatMap((p) => Object.keys(tally(p))));
    for (const kind of ITEM_KINDS) expect(seen.has(kind)).toBe(true);
  });

  it("gives the back of the pack more speed and the leader more defence", () => {
    const front = tally(0);
    const back = tally(1);
    expect(back.nitro!).toBeGreaterThan(front.nitro!);
    expect(front.shield!).toBeGreaterThan(back.shield!);
  });
});

describe("using items", () => {
  const setup = () => {
    const leader = createKart(0, "blaze", null, track, 60, 0);
    const chaser = createKart(1, "pip", 1, track, 30, 0);
    leader.race.progress = 60;
    chaser.race.progress = 30;
    return { leader, chaser, karts: [leader, chaser] };
  };

  it("throws the orb at the kart ahead and spins it out", () => {
    const { leader, chaser, karts } = setup();
    const events: RaceEvent[] = [];
    give(chaser, "orb");
    const orb = fireItem(chaser, karts, track, 1, 0, (e) => events.push(e));
    expect(orb?.target).toBe(0);
    expect(chaser.items).toEqual([]);
    let struck = null;
    for (let i = 0; i < 180 && !struck; i++) struck = stepProjectile(orb!, karts, track, STEP);
    expect(struck).toBe(leader);
    strike(leader, "orb", chaser.id, (e) => events.push(e));
    expect(leader.timers.stun).toBeGreaterThan(0);
    expect(events.some((e) => e.type === "hit" && e.kart === 0)).toBe(true);
  });

  it("cannot be used while the roulette still spins", () => {
    const { chaser, karts } = setup();
    chaser.items.push({ kind: "nitro", readyAt: 5 });
    expect(fireItem(chaser, karts, track, 1, 4, () => undefined)).toBeNull();
    expect(chaser.items[0]?.kind).toBe("nitro");
    fireItem(chaser, karts, track, 1, 5, () => undefined);
    expect(chaser.timers.boost).toBeGreaterThan(0);
  });

  it("hides a vanished kart from throws", () => {
    const { leader, chaser, karts } = setup();
    give(leader, "ghost");
    fireItem(leader, karts, track, 1, 0, () => undefined);
    expect(leader.timers.ghost).toBeGreaterThan(0);
    expect(nearestAhead(chaser, karts)).toBeNull();
  });

  it("lets a shield soak up one hit", () => {
    const { leader } = setup();
    const events: RaceEvent[] = [];
    leader.timers.shield = 5;
    strike(leader, "ice", 1, (e) => events.push(e));
    expect(leader.timers.ice).toBe(0);
    expect(leader.timers.shield).toBe(0);
    expect(events).toEqual([{ type: "blocked", kart: 0 }]);
    strike(leader, "ice", 1, (e) => events.push(e));
    expect(leader.timers.ice).toBeGreaterThan(0);
  });

  it("flies through a kart that vanishes and hits the one behind it", () => {
    const { leader, chaser, karts } = setup();
    const ahead = createKart(2, "nova", null, track, 90, 0);
    ahead.race.progress = 90;
    const all = [...karts, ahead];
    give(chaser, "orb");
    const orb = fireItem(chaser, all, track, 1, 0, () => undefined)!;
    expect(orb.target).toBe(leader.id);
    leader.timers.ghost = 5;
    let struck = null;
    for (let i = 0; i < 400 && !struck; i++) struck = stepProjectile(orb, all, track, STEP);
    expect(struck).toBe(ahead);
  });

  it("never hits a kart that has finished", () => {
    const { leader, chaser, karts } = setup();
    give(chaser, "orb");
    const orb = fireItem(chaser, karts, track, 1, 0, () => undefined)!;
    leader.race.finished = true;
    let struck = null;
    for (let i = 0; i < 400 && !struck; i++) struck = stepProjectile(orb, karts, track, STEP);
    expect(struck).toBeNull();
  });

  it("protects a kart for a moment after a spin, so hits never chain", () => {
    const { leader } = setup();
    const events: RaceEvent[] = [];
    strike(leader, "obstacle", null, (e) => events.push(e));
    while (leader.timers.stun > 0) tickTimers(leader, STEP);
    expect(leader.timers.grace).toBeGreaterThan(EFFECTS.afterSpin - 0.05);
    strike(leader, "obstacle", null, (e) => events.push(e));
    expect(leader.timers.stun).toBe(0);
    for (let t = 0; t < EFFECTS.afterSpin + 0.1; t += STEP) tickTimers(leader, STEP);
    strike(leader, "obstacle", null, (e) => events.push(e));
    expect(leader.timers.stun).toBeGreaterThan(0);
    expect(events.filter((e) => e.type === "hit")).toHaveLength(2);
  });
});
