/**
 * The QB's throw buttons as one press, slide and release: a finger down
 * on a colour lights that runner up, sliding onto another colour moves
 * the light, letting go on a colour throws to him, and letting go off
 * them all throws nothing. A quick tap is a press and a release on the
 * same button, so it still throws straight away. One finger at a time:
 * the other thumb is on the move stick. Pure, so it is tested alone.
 */

/** A button's place on screen, as getBoundingClientRect gives it. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Pixels round a button that still count as on it, so sliding across the gap between two never drops the light. */
export const SLOP = 6;

/** The button under a point, by slot: the nearest within `slop` pixels, or null off them all. */
export function slotAt(boxes: readonly (Box | null | undefined)[], x: number, y: number, slop = SLOP): number | null {
  let best: number | null = null;
  let bestGap = Infinity;
  boxes.forEach((b, slot) => {
    if (!b) return;
    const gap = Math.hypot(Math.max(b.left - x, 0, x - b.right), Math.max(b.top - y, 0, y - b.bottom));
    if (gap <= slop && gap < bestGap) {
      best = slot;
      bestGap = gap;
    }
  });
  return best;
}

/** The finger holding the throw buttons, and the slot it is over (null when slid off them all). */
export interface Gesture {
  pointer: number | null;
  slot: number | null;
}

export const IDLE: Gesture = { pointer: null, slot: null };

/** A finger went down. Only on a button, and only while no other finger holds one. */
export function press(g: Gesture, pointer: number, slot: number | null): Gesture {
  return g.pointer !== null || slot === null ? g : { pointer, slot };
}

/** The holding finger moved: onto another button, or off them all. */
export function slide(g: Gesture, pointer: number, slot: number | null): Gesture {
  return g.pointer !== pointer || g.slot === slot ? g : { pointer, slot };
}

/** The holding finger let go over `slot`: a throw there if that button can throw now, else nothing. */
export function lift(g: Gesture, pointer: number, slot: number | null, open: readonly boolean[]): { next: Gesture; throwAt: number | null } {
  if (g.pointer !== pointer) return { next: g, throwAt: null };
  return { next: IDLE, throwAt: slot !== null && open[slot] ? slot : null };
}

/** The browser took the finger away (a system gesture, a call): nothing is thrown. */
export function drop(g: Gesture, pointer: number): Gesture {
  return g.pointer === pointer ? IDLE : g;
}

/** The runner lit up: the one under the finger, while his button can throw. */
export function litSlot(g: Gesture, open: readonly boolean[]): number | null {
  return g.slot !== null && open[g.slot] ? g.slot : null;
}
