import type { MoveTuning } from "@/games/kit/camera";

/**
 * How Cube Game reads a jump. A little sooner than the kit's default,
 * since the beat does not wait: a smaller rise counts, and a fast start
 * counts sooner still. Everything else stays the kit's, so a jump still
 * needs the hips and shoulders to rise together.
 */
export const JUMP_TUNING: MoveTuning = { jump: { rise: 0.15, speed: 1.2 } };
