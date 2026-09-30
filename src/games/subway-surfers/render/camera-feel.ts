/**
 * What the chase camera adds on top of where it sits: a shake that dies
 * away after a knock, a wider view the faster
 * the run goes, and a quick kick wider on a big moment. Kept apart from
 * the placement so each can be tuned on its own.
 */
export class CameraFeel {
  /** Metres of shake left from the last knock. */
  private shake = 0;
  /** Degrees of the last kick still left. */
  private kickLeft = 0;
  /** Degrees wider at speed, eased so it swells rather than jumps. */
  private boost = 0;
  readonly offset = { x: 0, y: 0, roll: 0 };

  /** A knock: a crash, a stumble, a heavy landing. Stronger knocks win over weaker ones. */
  bump(amount: number): void {
    this.shake = Math.max(this.shake, amount);
  }

  /** A burst of speed: the view pulses wider by `degrees`, then settles. */
  kick(degrees: number): void {
    this.kickLeft = Math.max(this.kickLeft, degrees);
  }

  reset(): void {
    this.shake = 0;
    this.kickLeft = 0;
    this.boost = 0;
  }

  /** Eases everything on by `dt`. `fast` is 0 at the start pace, 1 at the top, and `extra` degrees wider on top. */
  update(dt: number, time: number, fast: number, extra: number): void {
    this.shake *= Math.exp(-5 * dt);
    this.kickLeft *= Math.exp(-3.5 * dt);
    // Up to eight degrees wider at the top speed: most of the rush of going fast.
    this.boost += (fast * fast * 8 + extra - this.boost) * (1 - Math.exp(-1.5 * dt));
    // Only a knock moves the lens. Speed never shakes it, so a fast run (Demon starts at the top pace) stays still.
    const knock = this.shake * 0.25;
    this.offset.x = Math.sin(time * 61) * knock;
    this.offset.y = Math.sin(time * 47) * knock;
    this.offset.roll = Math.sin(time * 53) * this.shake * 0.012;
  }

  /** Degrees added to the view now. */
  get widen(): number {
    return this.boost + this.kickLeft;
  }
}
