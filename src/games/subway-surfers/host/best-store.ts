import { addBests, parseTable, type BestEntry } from "../engine/best-scores";

const KEY = "standoff:subway-surfers:best";

/**
 * The best runs table, kept in this computer's browser only. Storage can
 * be missing or full (private windows), so every access is guarded and
 * the game plays on without it.
 */
export class BestStore {
  private table: BestEntry[];

  constructor() {
    this.table = this.load();
  }

  get current(): BestEntry[] {
    return this.table;
  }

  /** Records a round's runs and returns each one's place, or null if it did not make the table. */
  add(entries: readonly BestEntry[]): (number | null)[] {
    // Read storage again first, in case another tab on this computer added runs.
    const { table, places } = addBests(this.load(), entries);
    this.table = table;
    try {
      localStorage.setItem(KEY, JSON.stringify(table));
    } catch {
      // Without storage the table lasts until the tab closes.
    }
    return places;
  }

  private load(): BestEntry[] {
    try {
      return parseTable(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      return this.table ?? [];
    }
  }
}
