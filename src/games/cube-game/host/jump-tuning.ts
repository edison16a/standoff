import { SMALL_JUMP, type MoveTuning } from "@/games/kit/camera";

/**
 * How Cube Game reads a jump: the kit's small jump, since the beat does
 * not wait. A hop of about a third of a full jump counts, while bobbing
 * to the music, a nod and the bend of a landing never do.
 *
 * On top of that a rush: head and shoulders rising at 3 shoulder widths
 * a second or more count once they are 60% of the way to the band's top.
 * Only a push off rises that fast, so this fires a frame or two sooner
 * (about 35 ms at 30 frames a second) without catching a bob.
 */
export const JUMP_TUNING: MoveTuning = { ...SMALL_JUMP, head: { ...SMALL_JUMP.head, rushSpeed: 3, rushShare: 0.6 } };
