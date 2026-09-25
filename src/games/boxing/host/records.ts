import type { MatchResult } from "../engine/events";
import type { Records } from "./host-store";

const KEY = "standoff:boxing:records";

export const EMPTY_RECORDS: Records = { wins: 0, losses: 0, fastestKo: null, streak: 0 };

/**
 * Adds a fight against the computer to the records. `seconds` is how
 * long the fight ran. Returns the new records and, if one was beaten,
 * a line to celebrate it.
 */
export function addFight(records: Records, result: MatchResult, player: 0 | 1, seconds: number): { records: Records; best: string | null } {
  if (result.winner === null) return { records: { ...records, streak: 0 }, best: null };
  if (result.winner !== player) return { records: { ...records, losses: records.losses + 1, streak: 0 }, best: null };
  const next: Records = { ...records, wins: records.wins + 1, streak: records.streak + 1 };
  let best: string | null = null;
  if (result.method === "KO" || result.method === "TKO") {
    if (records.fastestKo === null || seconds < records.fastestKo) {
      next.fastestKo = seconds;
      best = records.fastestKo === null ? "Your first knockout" : "Your fastest knockout yet";
    }
  }
  if (!best && next.streak >= 2 && next.streak > records.streak) best = `${next.streak} wins in a row`;
  return { records: next, best };
}

export function parseRecords(raw: unknown): Records {
  if (!raw || typeof raw !== "object") return { ...EMPTY_RECORDS };
  const r = raw as Partial<Records>;
  const count = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  return {
    wins: count(r.wins),
    losses: count(r.losses),
    streak: count(r.streak),
    fastestKo: typeof r.fastestKo === "number" && Number.isFinite(r.fastestKo) && r.fastestKo > 0 ? r.fastestKo : null,
  };
}

/**
 * Kept in this computer's browser only. Storage can be missing or full,
 * as in a private window, so every access is guarded and the game plays
 * on without it.
 */
export function loadRecords(): Records {
  try {
    return parseRecords(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return { ...EMPTY_RECORDS };
  }
}

export function saveRecords(records: Records): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Without storage the records last until the tab closes.
  }
}
