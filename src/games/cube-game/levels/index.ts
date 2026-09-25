import type { Level, LevelInfo } from "../engine/types";
import * as circuitRush from "./circuit-rush";
import * as cloudHopper from "./cloud-hopper";
import * as coreMeltdown from "./core-meltdown";
import * as firstLight from "./first-light";
import * as sunsetBounce from "./sunset-bounce";

export interface LevelEntry {
  info: LevelInfo;
  build: () => Level;
}

/** Every level in order, easy first. Each is built when it is played, so the menu opens quickly. */
export const LEVELS: readonly LevelEntry[] = [firstLight, sunsetBounce, cloudHopper, circuitRush, coreMeltdown];

const built = new Map<string, Level>();

/** A level ready to play, built once and kept. */
export function levelById(id: string): Level {
  const cached = built.get(id);
  if (cached) return cached;
  const entry = LEVELS.find((level) => level.info.id === id) ?? LEVELS[0]!;
  const level = entry.build();
  built.set(entry.info.id, level);
  return level;
}
