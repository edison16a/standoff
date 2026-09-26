import { describe, expect, it } from "vitest";
import type { BattleEvent } from "../engine/events";
import { CUTS, FILM_START, FILMED, heroAt, LOOP_LEAD, PREROLL, showcaseBattle, STILL_AT } from "./script";

/** Plays the showcase fight to `until` seconds, noting when each event happened. */
function play(until: number) {
  const battle = showcaseBattle(7);
  const log: { at: number; e: BattleEvent }[] = [];
  while (battle.time < until - 1e-9) for (const e of battle.step()) log.push({ at: battle.time, e });
  return { battle, log };
}

// The media were filmed from this exact fight. An engine or bot change that moves it
// fails here, as a reminder to pick new moments and film the media again.
describe("showcase script", () => {
  const end = FILM_START + FILMED;
  const { log } = play(end);
  const kills = log.filter((l) => l.at > FILM_START + 1 && l.at < end - 1).map((l) => l.e).filter((e) => e.type === "kill");

  it("opens the film just after the warm up", () => {
    expect(LOOP_LEAD + 3).toBeCloseTo(FILM_START);
    expect(PREROLL).toBeLessThan(3);
  });

  it("lands a kill for each cut inside the loop, clear of the blended second", () => {
    expect(kills.map((k) => k.killer)).toEqual(CUTS.map((c) => c.fighter));
    // Each kill falls while its killer is the one on screen.
    for (const [i, kill] of kills.entries()) {
      const at = log.find((l) => l.e === kill)!.at;
      expect(heroAt(at)).toBe(kill.killer);
      expect(at).toBeGreaterThan(CUTS[i]!.from + 0.8);
    }
    expect(log.filter((l) => l.at > FILM_START && l.at < end && l.e.type === "hit").length).toBeGreaterThanOrEqual(8);
  });

  it("cuts to each fighter once, so no shoulder camera swings round from an old place", () => {
    expect(new Set(CUTS.map((c) => c.fighter)).size).toBe(CUTS.length);
  });

  it("holds the stills on the shotgun's killing blast", () => {
    const still = STILL_AT.poster;
    const blast = log.find((l) => l.e.type === "kill" && l.e.gun === "shotgun" && l.at > FILM_START);
    expect(blast).toBeDefined();
    // The muzzle flash lasts six hundredths of a second, so the still falls just after the shot.
    expect(still - blast!.at).toBeGreaterThanOrEqual(0);
    expect(still - blast!.at).toBeLessThan(0.05);
    expect(STILL_AT.icon).toBe(still);
  });
});
