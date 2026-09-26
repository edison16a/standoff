/**
 * A name tag on screen: where its bottom centre is anchored, and its
 * size. Measured in half screen heights, as the camera projects them,
 * with y growing down the screen.
 */
export interface TagBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Space kept between stacked tags, about three pixels on a 720 pixel screen. */
const GAP = 0.008;
const EPS = 1e-9;

/**
 * How far to lift each tag so that none covers another. The lowest on
 * screen, usually the nearest player, stays where it is, and a tag it
 * would overlap climbs just above it, and so on up. Returns each tag's
 * lift: zero, or negative for up the screen.
 */
export function stackTags(boxes: readonly TagBox[]): number[] {
  const lift = boxes.map(() => 0);
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[b]!.y - boxes[a]!.y);
  const placed: number[] = [];
  for (const i of order) {
    const a = boxes[i]!;
    for (let pass = 0; pass < boxes.length; pass++) {
      const hit = placed.find((j) => overlaps(a, lift[i]!, boxes[j]!, lift[j]!));
      if (hit === undefined) break;
      const b = boxes[hit]!;
      lift[i] = b.y + lift[hit]! - b.h - GAP - a.y;
    }
    placed.push(i);
  }
  return lift;
}

function overlaps(a: TagBox, liftA: number, b: TagBox, liftB: number): boolean {
  if (Math.abs(a.x - b.x) >= (a.w + b.w) / 2 + GAP) return false;
  const bottomA = a.y + liftA;
  const bottomB = b.y + liftB;
  // A tag just stacked on another sits exactly a gap above it, which rounding must not call an overlap.
  return bottomA > bottomB - b.h - GAP + EPS && bottomB > bottomA - a.h - GAP + EPS;
}
