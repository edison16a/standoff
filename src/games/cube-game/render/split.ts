/** One view's part of the screen, as fractions of the whole from the top left. */
export interface PaneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * How the screen splits between views: stacked top to bottom at full
 * width, the first view on top. The renderer draws into these and the
 * split screen map draws the same shapes, so the two always agree.
 */
export function splitRects(views: number): PaneRect[] {
  const count = Math.max(1, Math.floor(views));
  const h = 1 / count;
  return Array.from({ length: count }, (_, v) => ({ x: 0, y: v * h, w: 1, h }));
}
