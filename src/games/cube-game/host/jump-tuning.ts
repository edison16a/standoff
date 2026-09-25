import type { MoveTuning } from "@/games/kit/camera";

/**
 * How Cube Game reads a jump. Sooner than the kit's default, since the
 * beat does not wait: the head only needs to rise a quarter of a
 * shoulder width over its line, about 9 cm. That is still twice what a
 * rise onto the toes or a bob gives, and the kit's timing rule means a
 * slow stretch never counts. Nothing else is tuned: the game only jumps.
 */
export const JUMP_TUNING: MoveTuning = { head: { up: 0.25 } };
