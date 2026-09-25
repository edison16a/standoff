import { ramp } from "../geometry";

export interface LaneOptions {
  /** How many lanes, an odd number, the player's spot being the middle one. */
  lanes: number;
  /** One lane is this many of the player's shoulder widths across. */
  width: number;
  /** How far past halfway to the next lane, as a share of a lane, before the lane changes. */
  hysteresis: number;
}

export const DEFAULT_LANE: LaneOptions = { lanes: 3, width: 1, hysteresis: 0.15 };

export interface LaneReading {
  /** The lane, 0 in the middle, negative to the left of the picture. With 3 lanes: -1, 0 or 1. */
  lane: number;
  changed: boolean;
  /** How clearly the player stands in the lane rather than on a line, 0 to 1. */
  confidence: number;
}

/**
 * Where the player stands sideways, as a lane. It reads how far the head
 * and shoulders are from home, in shoulder widths, so moving over or
 * leaning well to a side both count. Lanes only switch once the player
 * is clearly past halfway, so standing on a line never flickers.
 */
export class LaneTracker {
  private lane = 0;

  constructor(private options: LaneOptions = DEFAULT_LANE) {}

  configure(options: LaneOptions): void {
    this.options = options;
    this.lane = Math.max(-this.edge, Math.min(this.edge, this.lane));
  }

  reset(): void {
    this.lane = 0;
  }

  private get edge(): number {
    return Math.max(0, Math.floor((this.options.lanes - 1) / 2));
  }

  /** `side` is the head and shoulders from home in shoulder widths. `seen` is how clearly the body is seen, 0 to 1. */
  update(side: number, seen = 1): LaneReading {
    const { width, hysteresis } = this.options;
    const position = side / width;
    const before = this.lane;
    while (this.lane < this.edge && position > this.lane + 0.5 + hysteresis) this.lane++;
    while (this.lane > -this.edge && position < this.lane - 0.5 - hysteresis) this.lane--;
    const fromMiddle = Math.abs(position - this.lane);
    return {
      lane: this.lane,
      changed: this.lane !== before,
      confidence: ramp(fromMiddle, 0.5 + hysteresis, 0.2) * ramp(seen, 0.4, 0.8),
    };
  }
}
