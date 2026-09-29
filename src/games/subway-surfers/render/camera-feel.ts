/**
 * What the chase camera adds on top of where it sits: a shake that dies
 * away after a knock, a faint rumble at speed, a wider view the faster
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
  /** How fast the run is, 0 at the start to 1 at the top. */
  private fast = 0;
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
    this.fast = 0;
  }

  /** Eases everything on by `dt`. `fast` is 0 at the start pace, 1 at the top, and `extra` degrees wider on top. */
  update(dt: number, time: number, fast: number, extra: number): void {
    this.fast = fast;
    this.shake *= Math.exp(-5 * dt);
    this.kickLeft *= Math.exp(-3.5 * dt);
    // Up to eight degrees wider at the top speed: most of the rush of going fast.
    this.boost += (fast * fast * 8 + extra - this.boost) * (1 - Math.exp(-1.5 * dt));
    // The knock is a quick jitter. The rumble is slower and faint, like the ground humming underfoot.
    const knock = this.shake * 0.25;
    const rumble = 0.018 * this.fast * this.fast;
    this.offset.x = Math.sin(time * 61) * knock + (Math.sin(time * 23.1) + Math.sin(time * 37.7)) * rumble;
    this.offset.y = Math.sin(time * 47) * knock + (Math.sin(time * 29.3) + Math.sin(time * 19.9)) * rumble;
    this.offset.roll = Math.sin(time * 53) * this.shake * 0.012;
  }

  /** Degrees added to the view now. */
  get widen(): number {
    return this.boost + this.kickLeft;
  }
}
