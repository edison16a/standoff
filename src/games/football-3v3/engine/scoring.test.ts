import { describe, expect, it } from "vitest";
import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import { Match } from "./match";
import { BOTS } from "./test-helpers";
import { STEP } from "./tuning";

/** A whole game of computer players takes seconds, more on a busy machine. */
const GAMES_MS = 180_000;

/**
 * Points a drive across whole computer games, played to the clock with
 * no target so a hot start cannot end one early. A drive starts each
 * time the other side lines up with the ball.
 */
function pointsPerDrive(level: BotLevel, seeds: readonly number[]): number {
  let points = 0;
  let drives = 0;
  for (const seed of seeds) {
    const m = new Match({ entries: BOTS, seed, level, quarterSeconds: 90, target: 999 });
    let offense = m.offense;
    drives++;
    for (let steps = 0; m.phase !== "over" && steps < 60 * 60 * 30; steps++) {
      m.step(STEP);
      m.drainEvents();
      if (m.offense !== offense && m.phase === "choose") {
        offense = m.offense;
        drives++;
      }
    }
    points += m.score[0] + m.score[1];
  }
  return points / drives;
}

/**
 * Eleven a side, with tiring legs and a juke that needs a breather,
 * scoring is hard work. Before the support players, the stamina and the
 * juke cooldown, computer games scored about five to six points a drive,
 * nearly a touchdown every time; now it is about two, as in real
 * football. These bands pin it there.
 */
describe("scoring", () => {
  it("comes to about two points a drive, at every level", () => {
    const medium = pointsPerDrive("medium", [101, 202]);
    expect(medium).toBeGreaterThan(0.8);
    expect(medium).toBeLessThan(3.5);
    const easy = pointsPerDrive("easy", [303]);
    const hard = pointsPerDrive("hard", [303]);
    expect(easy).toBeLessThan(3.5);
    expect(hard).toBeGreaterThan(0.8);
    expect(hard).toBeLessThan(4);
  }, GAMES_MS);
});
