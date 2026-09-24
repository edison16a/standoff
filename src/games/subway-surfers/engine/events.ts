import type { Lane } from "./tuning";
import type { ObstacleKind, PowerKind } from "./types";

/**
 * Everything that happens in a run, on the step it happens. The sound,
 * the sparks and the banners all hang off these.
 */
export type RunEvent =
  | { type: "coin"; streak: number; x: number; y: number; z: number; pulled: boolean }
  | { type: "jump"; boots: boolean }
  | { type: "land"; speed: number; roof: boolean }
  | { type: "roll" }
  | { type: "lane"; from: Lane; to: Lane }
  | { type: "stumble"; side: -1 | 1 }
  | { type: "crash"; cause: ObstacleKind | "caught"; obstacleId: number | null }
  | { type: "saved"; cause: ObstacleKind; obstacleId: number }
  | { type: "power"; kind: PowerKind }
  | { type: "powerEnd"; kind: PowerKind }
  | { type: "level"; multiplier: number }
  | { type: "horn"; lane: Lane; obstacleId: number }
  | { type: "passBy"; side: -1 | 1 };

export type CrashCause = ObstacleKind | "caught";
