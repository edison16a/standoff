const KEY = "standoff.cube-game.progress";

/** What this computer remembers: each level's best percent. Every level is open from the start. */
export interface Progress {
  best: Record<string, number>;
}

export const EMPTY_PROGRESS: Progress = { best: {} };

/** Reads progress from localStorage. Anything unreadable starts fresh rather than failing. */
export function loadProgress(storage: Pick<Storage, "getItem"> | null = safeStorage()): Progress {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    const best: Record<string, number> = {};
    for (const [id, value] of Object.entries(parsed.best ?? {})) {
      if (typeof value === "number" && value >= 0 && value <= 100) best[id] = Math.floor(value);
    }
    // Older saves also kept how many levels were open. Every level is open now, so that is dropped.
    return { best };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(progress: Progress, storage: Pick<Storage, "setItem"> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private windows can refuse storage. Progress then lasts for this visit only.
  }
}

/** Folds a finished attempt into progress: a better percent replaces a worse one. Practice does not count, as in the original. */
export function record(progress: Progress, levelId: string, percent: number, practice: boolean): Progress {
  if (practice) return progress;
  const best = Math.max(progress.best[levelId] ?? 0, percent);
  return { best: { ...progress.best, [levelId]: best } };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
