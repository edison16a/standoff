/** A callout's box on the overlay, in CSS pixels, centred on (left, top). */
export interface CalloutBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A callout still on screen, how far it climbs as it fades, and when it goes. */
export interface LiveCallout extends CalloutBox {
  rise: number;
  until: number;
}

/** Space kept between two stacked callouts. */
const GAP = 6;

function overlaps(a: CalloutBox, b: CalloutBox): boolean {
  return Math.abs(a.left - b.left) * 2 < a.width + b.width && Math.abs(a.top - b.top) * 2 < a.height + b.height + GAP * 2;
}

/**
 * Where a new callout goes so it never lands on top of one still showing.
 * A combo and a rare fruit cut in the same swipe both want the same spot,
 * and drawn over each other neither can be read. The new one moves up
 * above whatever it would cover, or below when there is no room above,
 * keeping its centre between `minTop` and `maxTop`. Callouts that have
 * gone by `now` no longer count.
 */
export function placeCallout(live: readonly LiveCallout[], want: CalloutBox, now: number, minTop: number, maxTop: number): CalloutBox {
  // A callout drifts up while it shows, so all of the path it climbs counts as taken.
  const others = live
    .filter((box) => box.until > now)
    .map((box) => ({ left: box.left, width: box.width, top: box.top - box.rise / 2, height: box.height + box.rise }));
  const clear = (box: CalloutBox) => !others.some((other) => overlaps(box, other));
  if (clear(want)) return want;
  for (const direction of [-1, 1] as const) {
    let box = want;
    // Each move clears the box it hit, so a stack of n needs at most n moves.
    for (let i = 0; i <= others.length; i++) {
      const hit = others.find((other) => overlaps(box, other));
      if (!hit) return box;
      // One pixel past the gap, so rounding never leaves it touching the box it just cleared.
      const top = hit.top + direction * ((hit.height + box.height) / 2 + GAP + 1);
      if (top < minTop || top > maxTop) break;
      box = { ...box, top };
    }
  }
  return want;
}
