import type { BotLevel } from "@/games/kit/difficulty/difficulty";
import type { BuildId } from "../../builds";
import { Match, type Entry } from "../match";
import { STEP } from "../tuning";
import { ShotLog } from "./shot-log";
import { summarise, type SimSummary } from "./summary";

export const SIM_LINEUP: readonly BuildId[] = ["shooter", "lockdown", "allround", "dunker", "big", "playmaker"];

/** A whole game is never longer than this many seconds, so a stuck one cannot hang a run. */
const MAX_GAME = 1500;

/** Plays one computer game to the end and logs every shot in it. */
export function playBotGame(seed: number, level: BotLevel, lineup: readonly BuildId[] = SIM_LINEUP): ShotLog {
  const entries: Entry[] = lineup.map((build, i) => ({ team: (i % 2) as 0 | 1, build, seat: null }));
  const m = new Match({ entries, seed, botLevel: level });
  const log = new ShotLog();
  for (let t = 0; t < MAX_GAME && m.phase !== "over"; t += STEP) {
    m.step(STEP);
    log.observe(m, m.drainEvents());
  }
  return log;
}

/** Plays `games` computer games from `firstSeed` on and sums them up. */
export function simulateBotGames(games: number, level: BotLevel, firstSeed = 1): SimSummary {
  const logs: ShotLog[] = [];
  for (let i = 0; i < games; i++) logs.push(playBotGame(firstSeed + i, level));
  return summarise(logs);
}
