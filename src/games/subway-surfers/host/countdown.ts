/** Counts down whole seconds: 3, 2, 1, then 0 for GO. */
export class Countdown {
  constructor(private left: number) {}

  /** Moves on by `dt` seconds. Returns the new number when it changes, else null. */
  tick(dt: number): number | null {
    const before = Math.ceil(this.left);
    this.left -= dt;
    const after = Math.max(0, Math.ceil(this.left));
    return after === before ? null : after;
  }
}
