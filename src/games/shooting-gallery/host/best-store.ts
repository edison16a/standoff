import { addBests, parseBook, type BestBook, type BestEntry } from "../engine/high-scores";

const KEY = "standoff:shooting-gallery:best";

/**
 * The high score book, kept in this computer's browser only. Nothing is
 * sent to a server. Storage can be missing or full (private windows), so
 * every access is guarded and the game plays on without it.
 */
export class BestStore {
  private book: BestBook;

  constructor() {
    this.book = this.load();
  }

  get current(): BestBook {
    return this.book;
  }

  /** Records a round's scores and returns each one's place in its table, or null if it did not make it. */
  add(entries: readonly BestEntry[]): (number | null)[] {
    // Read storage again first, in case another tab on this computer added scores.
    const { book, places } = addBests(this.load(), entries);
    this.book = book;
    this.save();
    return places;
  }

  private load(): BestBook {
    try {
      return parseBook(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {
      return this.book ?? {};
    }
  }

  private save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.book));
    } catch {
      // Without storage the scores last until the tab closes.
    }
  }
}
