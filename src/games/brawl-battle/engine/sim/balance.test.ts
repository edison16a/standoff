import { describe, expect, it } from "vitest";
import { CHARACTER_IDS } from "../../roster";
import { DIFFICULTIES } from "../bots/brain";
import { describeTally, fourWay, oneOnOne, pairings } from "./balance";

/**
 * Bot balance, skipped by default because it plays thousands of matches.
 * Run it after changing moves, bodies or bots:
 *
 *   BRAWL_BALANCE=1 npx vitest run src/games/brawl-battle/engine/sim
 *
 * BRAWL_BALANCE_GAMES sets the four bot matches per difficulty (default
 * 1000); each pairing plays a fifth of that. BRAWL_BALANCE_SEED moves
 * the seeds, to check a result is not luck. The bounds leave room for
 * noise: at 1000 matches a 25 percent share wobbles by about 3 points.
 */
const on = !!process.env.BRAWL_BALANCE;
const games = Number(process.env.BRAWL_BALANCE_GAMES ?? 1000);
const seed = Number(process.env.BRAWL_BALANCE_SEED ?? 1);
const pairGames = Math.max(20, Math.round(games / 5));

describe.skipIf(!on)("balance", () => {
  // Easy bots dither too much to say anything about the fighters.
  for (const difficulty of DIFFICULTIES.filter((d) => d !== "easy")) {
    it(`gives every fighter a fair share of four bot wins on ${difficulty}`, () => {
      const tally = fourWay(games, difficulty, seed);
      console.log(`${difficulty}, four bots\n${describeTally(tally)}`);
      for (const c of CHARACTER_IDS) {
        const share = tally.wins[c] / tally.games;
        expect(share, c).toBeGreaterThan(0.18);
        expect(share, c).toBeLessThan(0.32);
      }
    }, 600_000);

    it(`keeps every one on one close on ${difficulty}`, () => {
      const lines: string[] = [];
      for (const [a, b] of pairings()) {
        const tally = oneOnOne(a, b, pairGames, difficulty, seed + 100_000);
        const share = tally.wins[a] / tally.games;
        lines.push(`${a} v ${b}: ${tally.wins[a]} to ${tally.wins[b]}`);
        expect(share, `${a} v ${b}`).toBeGreaterThan(0.33);
        expect(share, `${a} v ${b}`).toBeLessThan(0.67);
      }
      console.log(`${difficulty}, one on one\n${lines.join("\n")}`);
    }, 600_000);
  }
});
