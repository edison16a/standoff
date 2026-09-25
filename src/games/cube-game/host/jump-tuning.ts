import type { MoveTuning } from "@/games/kit/camera";

/**
 * How Cube Game reads a jump. A little sooner than the kit's default,
 * since the beat does not wait: the head needs to rise a little less
 * over its head line to count. Everything else stays the kit's, so a
 * slow stretch or a bob still never counts.
 */
export const JUMP_TUNING: MoveTuning = { head: { up: 0.28 } };
