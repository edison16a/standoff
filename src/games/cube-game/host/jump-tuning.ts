import { SMALL_JUMP, type MoveTuning } from "@/games/kit/camera";

/**
 * How Cube Game reads a jump: the kit's small jump, since the beat does
 * not wait. A hop of about a third of a full jump counts, while bobbing
 * to the music, a nod and the bend of a landing never do. Nothing else
 * is tuned: the game only jumps.
 */
export const JUMP_TUNING: MoveTuning = SMALL_JUMP;
