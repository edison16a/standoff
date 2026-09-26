/**
 * The geometry of the home screen's game row, kept pure so it can be tested.
 * Every tile is the same small size except the chosen one, so a tile's place
 * along the row follows from its index alone once the sizes have settled.
 */
export interface RailSizes {
  /** A tile that is not chosen. */
  small: number;
  /** The chosen tile. */
  large: number;
  gap: number;
  /** Space kept clear at each side of the screen. */
  edge: number;
  /** The visible width of the row. */
  width: number;
}

/** Where tile `at` starts along the track, with every tile before it small. */
export function tileLeft(at: number, sizes: RailSizes): number {
  return sizes.edge + at * (sizes.small + sizes.gap);
}

/**
 * How far the track should slide for the chosen tile. The row stays still
 * while the chosen tile is fully in view. Once a move takes it past either
 * edge, the row slides so the chosen tile sits in the middle of the screen.
 */
export function railShift(at: number, shift: number, sizes: RailSizes): number {
  const left = tileLeft(at, sizes) - shift;
  const right = left + sizes.large;
  // A pixel of slack so rounding never counts as leaving the view.
  if (left >= sizes.edge - 1 && right <= sizes.width - sizes.edge + 1) return shift;
  return tileLeft(at, sizes) + sizes.large / 2 - sizes.width / 2;
}

/** Where the track starts: the chosen tile at the left edge, like the console. */
export function startShift(at: number, sizes: RailSizes): number {
  return tileLeft(at, sizes) - sizes.edge;
}

/**
 * How many whole copies to step back so tile `at` lands in the middle copy.
 * Zero when it is already there.
 */
export function copiesOff(at: number, count: number, copies: number): number {
  const middle = Math.floor(copies / 2);
  return Math.floor(at / count) - middle;
}

/**
 * The short way round from one game to another, so stepping right from the
 * last game lands on the first one just to its right.
 */
export function shortStep(from: number, to: number, count: number): number {
  let step = (((to - from) % count) + count) % count;
  if (step > count / 2) step -= count;
  return step;
}
