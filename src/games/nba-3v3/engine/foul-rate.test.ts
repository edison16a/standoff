import { describe, expect, it } from "vitest";
import type { BuildId } from "../builds";
import { Match, type Entry } from "./match";
import { STEP } from "./tuning";

const BUILDS: BuildId[] = ["shooter", "lockdown", "allround", "dunker", "big", "playmaker"];
const GAMES = 16;

/** Whole bot games, counting every whistle and every shot. */
function play(level: "easy" | "hard"): { fouls: number; shootingPerShot: number } {
  let fouls = 0;
  let shooting = 0;
  let shots = 0;
  for (let seed = 1; seed <= GAMES; seed++) {
    const entries: Entry[] = BUILDS.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));
    const m = new Match({ entries, seed, botLevel: level });
    for (let t = 0; t < 1500 && m.phase !== "over"; t += STEP) {
      m.step(STEP);
      for (const e of m.drainEvents()) {
        if (e.type === "foul") fouls++;
        if (e.type === "foul" && e.call === "shooting") shooting++;
        if (e.type === "shot") shots++;
      }
    }
  }
  return { fouls: fouls / GAMES, shootingPerShot: shooting / Math.max(1, shots) };
}

describe("how often the whistle goes", () => {
  // A game here is a couple of minutes, so an NBA rate scaled down is about one call a game.
  it.each(["easy", "hard"] as const)("calls a foul about once a game with %s bots, not every trip", (level) => {
    const { fouls, shootingPerShot } = play(level);
    expect(fouls).toBeGreaterThan(0.2);
    expect(fouls).toBeLessThan(1.8);
    // Most contests are clean: only a few shots in a hundred draw a call.
    expect(shootingPerShot).toBeLessThan(0.08);
    // Sixteen whole games each: a few seconds, longer on a busy machine.
  }, 120000);
});
