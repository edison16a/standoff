import { SMALL_JUMP, type MoveTuning } from "@/games/kit/camera";
import type { SmoothingOptions } from "@/games/kit/camera/engine/smoothing";

/**
 * How Cube Game reads a jump: the kit's small jump, since the beat does
 * not wait. A hop of about a third of a full jump counts, while bobbing
 * to the music, a nod and the bend of a landing never do. Nothing else
 * is tuned: the game only jumps.
 */
export const JUMP_TUNING: MoveTuning = SMALL_JUMP;

/**
 * Lighter smoothing than the kit's. Standing still is steadied just as
 * much, but the filter lets go sooner once the head moves, so a quick
 * rise gets through about a frame earlier. Bobbing still stays under the
 * jump line.
 */
export const JUMP_SMOOTHING: SmoothingOptions = { minCutoff: 1.5, beta: 20, worldBeta: 3 };
