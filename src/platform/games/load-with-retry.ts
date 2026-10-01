import { loadGame } from "@/games/catalog";
import type { GameModule } from "./game-api";

/** A game whose code fails to download gets one more try after this long. */
export const LOAD_RETRY_MS = 1500;

/**
 * Loads a game's code, trying once more if the first download fails.
 * Both the big screen and the phones use it: a phone that drops its
 * network for a moment just as it is seated would otherwise show
 * "The game did not load" for a blip.
 */
export function loadWithRetry(id: string, wait = LOAD_RETRY_MS): Promise<GameModule> {
  const first = loadGame(id);
  // A game this build does not know will not appear on a second try.
  if (!first) return Promise.reject(new Error(`Unknown game ${id}`));
  const again = () => loadGame(id) ?? Promise.reject(new Error(`Unknown game ${id}`));
  return first.catch(() => new Promise<void>((resolve) => setTimeout(resolve, wait)).then(again));
}
