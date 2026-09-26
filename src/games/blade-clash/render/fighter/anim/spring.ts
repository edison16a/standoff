/** Steps no longer than this keep a stiff spring stable at any frame rate. */
const MAX_STEP = 1 / 120;

/**
 * A damped spring chasing a target, the way a body settles into a new
 * position instead of snapping to it. A kick adds speed, which is how a
 * hit or a clash shoves part of the body and lets it swing back.
 */
export class Spring {
  velocity = 0;

  constructor(
    public value = 0,
    /** How quickly it follows, in radians a second. */
    private readonly frequency = 10,
    /** 1 settles without overshoot; lower wobbles on the way. */
    private readonly damping = 0.85,
  ) {}

  update(target: number, dt: number): number {
    const steps = Math.max(1, Math.ceil(dt / MAX_STEP));
    const h = dt / steps;
    const w = this.frequency;
    for (let i = 0; i < steps; i++) {
      this.velocity += (w * w * (target - this.value) - 2 * this.damping * w * this.velocity) * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  kick(speed: number): void {
    this.velocity += speed;
  }

  snap(value: number): void {
    this.value = value;
    this.velocity = 0;
  }
}
