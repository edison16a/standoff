import { newEntry, parseBoard, placeEntry, type BoardOrder, type LeaderEntry, type Placement } from "./board";

/** Every board's key starts with this, so all of them can be found and cleared together. */
export const BOARD_PREFIX = "standoff:board:";
/** Told on this page when a board changes, so an open list can redraw. Other tabs hear the `storage` event. */
const CHANGED = "standoff:boards-changed";
/** When storage is full the board keeps this many of its best runs rather than none. */
const KEEP_WHEN_FULL = 2000;

/** One game's board, like Subway Runner's runs or one Cube Game level's finish times. */
export interface BoardRef {
  game: string;
  board: string;
  order: BoardOrder;
}

/** The part of the browser's Storage the boards use, so tests can hand in their own. */
export type BoardStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

export function boardKey(ref: Pick<BoardRef, "game" | "board">): string {
  return `${BOARD_PREFIX}${ref.game}:${ref.board}`;
}

/**
 * The browser's localStorage, or a stand in kept in memory while this tab
 * is open when storage is missing or blocked (private windows, some
 * embedded browsers), so a game plays on without it.
 */
export function localBoards(): BoardStorage {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // Reading localStorage itself throws when site data is blocked.
  }
  return memory;
}

/** A board, best first. Anything unreadable reads as an empty board. */
export function readBoard(ref: BoardRef, storage: BoardStorage = localBoards()): LeaderEntry[] {
  try {
    return parseBoard(JSON.parse(storage.getItem(boardKey(ref)) ?? "[]"), ref.order);
  } catch {
    return [];
  }
}

/** Saves a finished run and says where it landed. Every run is kept, however low. */
export function recordEntry(
  ref: BoardRef,
  run: { name: string; value: number; tag?: string; at?: number },
  storage: BoardStorage = localBoards(),
): Placement {
  const entry = newEntry({ ...run, at: run.at ?? Date.now() });
  // Read again first, in case another tab on this computer saved a run meanwhile.
  const placement = placeEntry(readBoard(ref, storage), entry, ref.order);
  write(storage, boardKey(ref), placement.entries);
  announce();
  return placement;
}

/** Wipes the boards of one game, or of every game. Returns how many boards went. */
export function clearBoards(game?: string, storage: BoardStorage = localBoards()): number {
  const prefix = game ? `${BOARD_PREFIX}${game}:` : BOARD_PREFIX;
  const keys = boardKeys(storage).filter((key) => key.startsWith(prefix));
  for (const key of keys) storage.removeItem(key);
  announce();
  return keys.length;
}

/** How many runs are saved across every game's boards, for the settings panel. */
export function countRuns(storage: BoardStorage = localBoards()): number {
  let runs = 0;
  for (const key of boardKeys(storage)) {
    try {
      const raw: unknown = JSON.parse(storage.getItem(key) ?? "[]");
      if (Array.isArray(raw)) runs += raw.length;
    } catch {
      // A broken board counts as empty. Clearing still removes it.
    }
  }
  return runs;
}

/** Calls `listener` whenever any board changes, here or in another tab. Returns the way to stop. */
export function onBoardsChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(BOARD_PREFIX)) listener();
  };
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function boardKeys(storage: BoardStorage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(BOARD_PREFIX)) keys.push(key);
  }
  return keys;
}

function write(storage: BoardStorage, key: string, entries: readonly LeaderEntry[]): void {
  try {
    storage.setItem(key, JSON.stringify(entries));
  } catch {
    // Storage is full: keep the best runs rather than lose the board. Failing that, the old board stays.
    try {
      storage.setItem(key, JSON.stringify(entries.slice(0, KEEP_WHEN_FULL)));
    } catch {
      // Nothing more to try. The run still shows its place on the results.
    }
  }
}

function announce(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED));
}

/** The in memory stand in for localStorage. */
class MemoryStorage implements BoardStorage {
  private readonly items = new Map<string, string>();
  get length(): number {
    return this.items.size;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

const memory = new MemoryStorage();

/** A fresh in memory storage, for tests. */
export function memoryBoards(): BoardStorage {
  return new MemoryStorage();
}
