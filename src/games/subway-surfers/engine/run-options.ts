import type { Lane } from "./tuning";
import type { Yard } from "./yard";

/** How one run is set up: the tutorial or a real run, where it starts and how hard it is. */
export interface RunOptions {
  /** The tutorial: an empty yard at a gentle jog. */
  practice?: boolean;
  lane?: Lane;
  /** Metres of head start on the pace and the yard's busyness. See `difficulty.ts`. */
  headStart?: number;
  /** How hard the yard pushes past the head start. See `yard.ts`. */
  yard?: Yard;
  /** The difficulty's score multiplier, on every point. */
  scoreScale?: number;
}
