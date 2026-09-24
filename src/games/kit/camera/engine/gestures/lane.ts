import type { Body } from "../body";
import type { Baseline } from "../calibration";
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
  /** Where the hips are from the player's spot, in their shoulder widths, negative to the left. */
  offset: number;
  changed: boolean;
  confidence: number;
}

/**
 * Where the player stands sideways, as a lane. The hips decide, so a lean
 * or a punch never changes lane. Lanes only switch once the player is
 * clearly past halfway, so standing on a line never flickers.
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

  /** `nearness` is the player's size now over their size at calibration, so steps are measured at today's size. */
  update(body: Body, baseline: Baseline, nearness = 1): LaneReading {
    const { width, hysteresis } = this.options;
    const unit = baseline.shoulderWidth * nearness;
    const offset = ((body.hips.x - baseline.centerX) * body.aspect) / unit;
    const position = offset / width;
    const before = this.lane;
    while (this.lane < this.edge && position > this.lane + 0.5 + hysteresis) this.lane++;
    while (this.lane > -this.edge && position < this.lane - 0.5 - hysteresis) this.lane--;
    const fromMiddle = Math.abs(position - this.lane);
    return {
      lane: this.lane,
      offset,
      changed: this.lane !== before,
      confidence: ramp(fromMiddle, 0.5 + hysteresis, 0.2) * ramp(body.confidence, 0.4, 0.8),
    };
  }
}
