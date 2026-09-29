import { SMALL_JUMP, type MoveTuning } from "@/games/kit/camera";

/**
 * How Cube Game reads a jump: the kit's small jump, since the beat does
 * not wait. A hop of about a third of a full jump counts, while bobbing
 * to the music, a nod and the bend of a landing never do.
 *
 * On top of that a rush: head and shoulders rising at 4 shoulder widths
 * a second or more count once they are 70% of the way to the band's top.
 * Only a push off rises that fast, so this fires a frame or two sooner
 * (about 35 ms at 30 frames a second) without catching a bob.
 *
 * The head line only follows a player who has rested for 400 ms. A bob
 * is still for an instant at its bottom, and following those instants
 * dragged the line down until bobbing to the music read as jumping.
 */
export const JUMP_TUNING: MoveTuning = {
  ...SMALL_JUMP,
  head: { ...SMALL_JUMP.head, rushSpeed: 4, rushShare: 0.7 },
  line: { ...SMALL_JUMP.line, restMs: 400 },
};
