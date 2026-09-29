import { COIN } from "./tuning";

/** Points for picking up a power up, before the multipliers: worth ten coins. */
export const POWER_POINTS = 100;

/**
 * A run's score, kept by where it came from so the results can show it.
 * Every point is multiplied twice: by the run's multiplier (the zone,
 * doubled by the score multiplier power up) and by the difficulty's.
 */
export class Points {
  /** From distance run. */
  running = 0;
  coins = 0;
  powers = 0;

  constructor(
    /** The difficulty's multiplier. */
    readonly scale = 1,
  ) {}

  get total(): number {
    return this.running + this.coins + this.powers;
  }

  /** Coins and power ups together, the points on top of distance. */
  get bonus(): number {
    return this.coins + this.powers;
  }

  ran(metres: number, multiplier: number): void {
    this.running += metres * multiplier * this.scale;
  }

  coin(multiplier: number): void {
    this.coins += COIN.points * multiplier * this.scale;
  }

  power(multiplier: number): void {
    this.powers += POWER_POINTS * multiplier * this.scale;
  }
}
