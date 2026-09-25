import type { Look } from "../render/models/looks";
import type { FightDriver } from "./fight-driver";
import type { BoxingState, Records } from "./host-store";
import { addFight, saveRecords } from "./records";

/**
 * The results of a finished fight, for the store: who won and how, the
 * scorecards, each boxer's numbers, and the records against the computer
 * kept on this computer.
 */
export function finishFight(driver: FightDriver, looks: readonly [Look, Look], records: Records): Partial<BoxingState> {
  const match = driver.match;
  const result = match.result;
  if (!result) return { screen: "results" };
  const stats = match.fighters.map((f) => ({
    thrown: f.stats.thrown,
    landed: f.stats.landed,
    blocked: f.stats.blocked,
    dodged: f.stats.dodged,
    counters: f.stats.counters,
    knockdowns: match.fighters[f.id === 0 ? 1 : 0].stats.knockdowns,
  })) as unknown as [Record<string, number>, Record<string, number>];
  let nextRecords = records;
  let newBest: string | null = null;
  const player = driver.slots[0] !== null && driver.slots[1] === null ? 0 : null;
  if (player !== null) {
    // Seconds of fighting: full rounds before this one, and how far into this one it went.
    const seconds = (result.round - 1) * (match.roundMs / 1000) + (result.method === "KO" || result.method === "TKO" ? result.second : match.roundMs / 1000);
    const added = addFight(records, result, player, seconds);
    nextRecords = added.records;
    newBest = added.best;
    saveRecords(nextRecords);
  }
  return {
    screen: "results",
    result: { ...result, names: [looks[0].name, looks[1].name], stats },
    records: nextRecords,
    newBest,
  };
}
