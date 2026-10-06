import { useState } from "react";
import type { ItemKind } from "../engine/items";

/**
 * True when the item now in the big slot slid forward from the queue on
 * the latest use, rather than landing fresh from a box. It compares with
 * what was queued before, so an update that carries a use and a new box
 * at once does not pretend the new item slid.
 */
export function useSlideForward(uses: number, item: ItemKind | null, next: ItemKind | null): boolean {
  const [seen, setSeen] = useState({ uses, next, slid: false });
  if (seen.uses !== uses || seen.next !== next) {
    const slid = seen.uses !== uses && seen.next !== null && seen.next === item;
    // Storing what was seen during render is React's way to compare with the last render.
    setSeen({ uses, next, slid });
    return slid;
  }
  return seen.slid;
}
