import { describe, expect, it } from "vitest";
import { Blade } from "./blade";
import { Combos } from "./combos";
import type { MatchEvent } from "./events";
import { KINDS } from "./fruit-kinds";
import { Match } from "./match";
import { DEFAULT_SETTINGS } from "./settings";
import { Spawner } from "./spawner";
import { Rng } from "./rng";
import { COMBO_WINDOW_S, COUNTDOWN_S, POINTS } from "./tuning";

const DT = 1 / 60;

function run(match: Match, seconds: number, blades = new Map<number, Blade>()): MatchEvent[] {
  const events: MatchEvent[] = [];
  for (let t = 0; t < seconds; t += DT) events.push(...match.step(DT, blades));
  return events;
}

/** Puts a still fruit in front of the blade and swipes through it. */
function sliceOne(match: Match, kind: "orange" | "bomb" | "star-fruit", seat = 1): MatchEvent[] {
  match.arena.launch({ kind, x: 0, y: 0, vx: 0, vy: 0, spin: { x: 0, y: 0, z: 0 } });
  const blade = new Blade();
  const events: MatchEvent[] = [];
  for (let i = 0; i <= 10; i++) {
    blade.move({ x: -4 + i * 0.8, y: 0 }, i * DT);
    events.push(...match.step(0, new Map([[seat, blade]])));
  }
  return events;
}

describe("a round", () => {
  it("counts down, plays for the set time, then ends", () => {
    const match = new Match({ ...DEFAULT_SETTINGS, seconds: 45 }, [1, 2], 7, 9);
    expect(match.countdown).toBe(3);
    const events = run(match, COUNTDOWN_S + 45 + 4);
    const phases = events.filter((e) => e.type === "phase").map((e) => (e as { phase: string }).phase);
    expect(phases).toEqual(["playing", "ending", "over"]);
    expect(events.some((e) => e.type === "spawn")).toBe(true);
    expect(match.secondsLeft).toBe(0);
  });

  it("scores a slice and never lets a bomb push a score below zero", () => {
    const match = new Match(DEFAULT_SETTINGS, [1], 1, 9);
    run(match, COUNTDOWN_S + DT);
    sliceOne(match, "orange");
    expect(match.scores.get(1)).toBe(KINDS.orange.points);
    const bomb = sliceOne(match, "bomb");
    expect(bomb.some((e) => e.type === "stun")).toBe(true);
    expect(match.scores.get(1)).toBe(0);
    expect(match.canCut(1)).toBe(false);
  });

  it("pays more for rare fruit", () => {
    const match = new Match(DEFAULT_SETTINGS, [1], 1, 9);
    run(match, COUNTDOWN_S + DT);
    const events = sliceOne(match, "star-fruit");
    expect(events.find((e) => e.type === "score")).toMatchObject({ reason: "rare", delta: KINDS["star-fruit"].points });
  });

  it("ignores cuts during the countdown and from players who left", () => {
    const match = new Match(DEFAULT_SETTINGS, [1, 2], 1, 9);
    sliceOne(match, "orange");
    expect(match.scores.get(1)).toBe(0);
    run(match, COUNTDOWN_S + DT);
    match.setActive(2, false);
    sliceOne(match, "orange", 2);
    expect(match.scores.get(2)).toBe(0);
    expect(match.has(2)).toBe(true);
  });

  it("names the top scorers as winners, and nobody when nobody scored", () => {
    const match = new Match(DEFAULT_SETTINGS, [1, 2, 3], 1, 9);
    expect(match.winners()).toEqual([]);
    match.scores.set(2, 40);
    match.scores.set(3, 40);
    expect(match.winners()).toEqual([2, 3]);
    expect(match.standings()[0]!.seat).toBe(2);
  });
});

describe("combos", () => {
  it("turns three quick cuts into a combo", () => {
    const combos = new Combos();
    for (let i = 0; i < 3; i++) combos.add(1, { x: i, y: 0 });
    expect(combos.step(COMBO_WINDOW_S / 2)).toEqual([]);
    expect(combos.step(COMBO_WINDOW_S)).toEqual([{ seat: 1, count: 3, at: { x: 2, y: 0 } }]);
  });

  it("drops a run of two, and a run a bomb cancelled", () => {
    const combos = new Combos();
    combos.add(1, { x: 0, y: 0 });
    combos.add(1, { x: 0, y: 0 });
    for (let i = 0; i < 4; i++) combos.add(2, { x: 0, y: 0 });
    combos.cancel(2);
    expect(combos.flush()).toEqual([]);
  });

  it("is worth points per fruit in the round", () => {
    const match = new Match(DEFAULT_SETTINGS, [1], 1, 9);
    run(match, COUNTDOWN_S + DT);
    for (let i = 0; i < 4; i++) sliceOne(match, "orange");
    const events = run(match, COMBO_WINDOW_S + DT);
    expect(events.find((e) => e.type === "score" && e.reason === "combo")).toMatchObject({ delta: 4 * POINTS.comboPerFruit, count: 4 });
  });
});

describe("the spawner", () => {
  it("throws fruit that peaks inside the screen", () => {
    const spawner = new Spawner(new Rng(3), { rate: 1, bombChance: 0.2, specials: true });
    const launches = [];
    for (let t = 0; t < 60; t += DT) launches.push(...spawner.step(DT, { halfWidth: 9, elapsed: t, remaining: 60 - t, players: 2, bodies: [] }));
    expect(launches.length).toBeGreaterThan(30);
    for (const launch of launches) {
      const apexY = launch.y + (launch.vy * launch.vy) / (2 * 9.5);
      expect(apexY).toBeLessThan(5);
      expect(apexY).toBeGreaterThan(-4);
    }
    expect(launches.some((l) => l.kind === "bomb")).toBe(true);
  });

  it("sends no bombs when bombs are off", () => {
    const spawner = new Spawner(new Rng(5), { rate: 1.4, bombChance: 0, specials: true });
    const kinds = [];
    for (let t = 0; t < 90; t += DT) kinds.push(...spawner.step(DT, { halfWidth: 9, elapsed: t, remaining: 90 - t, players: 4, bodies: [] }).map((l) => l.kind));
    expect(kinds).not.toContain("bomb");
  });
});
