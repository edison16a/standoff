import { describe, expect, it } from "vitest";
import type { BattleEvent } from "../engine/events";
import { PREROLL, showcaseBattle, STILL_AT } from "./script";

/** Plays the showcase fight to `until` seconds, noting when each event happened. */
function play(until: number) {
  const battle = showcaseBattle(7);
  const log: { at: number; e: BattleEvent }[] = [];
  while (battle.time < until - 1e-9) for (const e of battle.step()) log.push({ at: battle.time, e });
  return { battle, log };
}

// The stills were filmed from this exact fight. An engine or bot change that moves it
// fails here, as a reminder to pick new moments and film the media again.
describe("showcase stills", () => {
  const { log } = play(92);

  it("starts the film inside the capture's warm up", () => {
    expect(PREROLL).toBeLessThan(3);
  });

  it("holds the stills on the shotgun's killing blast", () => {
    const blast = log.find((l) => l.e.type === "kill" && l.e.gun === "shotgun" && l.at > 85);
    expect(blast).toBeDefined();
    // Each still falls just after the shot, with the balls in flight and the paint bursting.
    for (const still of [STILL_AT.poster, STILL_AT.icon]) {
      expect(still - blast!.at).toBeGreaterThanOrEqual(0);
      expect(still - blast!.at).toBeLessThan(0.05);
    }
  });
});
