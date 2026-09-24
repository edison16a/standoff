/** A viewport as fractions of the canvas, from the top left. */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The split screen for one to four players: one full view, two side by
 * side, three or four in quadrants. With three players the top right
 * quadrant is left for the map and the standings. Kept pure so the host
 * overlay and the renderer always agree on where each view is.
 */
export function splitScreen(count: number): ViewRect[] {
  switch (count) {
    case 0:
    case 1:
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    case 2:
      return [
        { x: 0, y: 0, w: 0.5, h: 1 },
        { x: 0.5, y: 0, w: 0.5, h: 1 },
      ];
    case 3:
      // The top right quadrant is left for the overall map, where it always sits.
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
    default:
      return [
        { x: 0, y: 0, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
      ];
  }
}
