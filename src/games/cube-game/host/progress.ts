const KEY = "standoff.cube-game.progress";

/** What this computer remembers: each level's best percent and how many levels are open. */
export interface Progress {
  best: Record<string, number>;
  /** Levels open to play, counting from the first. */
  unlocked: number;
}

export const EMPTY_PROGRESS: Progress = { best: {}, unlocked: 1 };

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
    const unlocked = typeof parsed.unlocked === "number" ? Math.max(1, Math.floor(parsed.unlocked)) : 1;
    return { best, unlocked };
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

/**
 * Folds a finished round into progress: better percents replace worse,
 * and finishing a level opens the next. Practice counts for neither, as
 * in the original.
 */
export function record(progress: Progress, levelId: string, index: number, percent: number, practice: boolean): Progress {
  if (practice) return progress;
  const best = Math.max(progress.best[levelId] ?? 0, percent);
  const unlocked = percent >= 100 ? Math.max(progress.unlocked, index + 2) : progress.unlocked;
  return { best: { ...progress.best, [levelId]: best }, unlocked };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
