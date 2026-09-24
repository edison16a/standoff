import type { GameInfo, GameModule } from "@/platform/games/game-api";
import { info as fencing } from "./fencing/info";
import { info as fruitNinja } from "./fruit-ninja/info";
import { info as magicKart } from "./magic-kart/info";
import { info as shootingGallery } from "./shooting-gallery/info";
import { info as zombieSurvival } from "./zombie-survival/info";

/**
 * Every game, in the order the home screen shows them. This file and each
 * game's own folder are all a new game touches: add its info here, and
 * its loader below once it can be played.
 */
export const GAMES: readonly GameInfo[] = [fencing, fruitNinja, magicKart, zombieSurvival, shootingGallery];

/**
 * Loaded only when a room for that game opens, so the home screen never
 * downloads a game nobody picked.
 */
const LOADERS: Record<string, () => Promise<GameModule>> = {
  fencing: () => import("./fencing").then((mod) => mod.game),
  "fruit-ninja": () => import("./fruit-ninja").then((mod) => mod.game),
  "shooting-gallery": () => import("./shooting-gallery").then((mod) => mod.game),
};

export function findGame(id: string): GameInfo | undefined {
  return GAMES.find((game) => game.id === id);
}

export function loadGame(id: string): Promise<GameModule> | null {
  return LOADERS[id]?.() ?? null;
}
