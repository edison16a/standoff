/**
 * The One Euro filter (Casiez, Roussel and Vogel, 2012). A hand held
 * phone shakes a little all the time. A plain low pass would steady the
 * dot but make fast swings lag, so this one smooths hard when the aim is
 * nearly still and barely at all when it moves quickly.
 */
export class OneEuro {
  private value: number | null = null;
  private speed = 0;
  private last = 0;

  constructor(
    /** Smoothing when still, in hertz. Lower is steadier. */
    private readonly minCutoff = 1.2,
    /** How quickly smoothing falls away as the aim speeds up. */
    private readonly beta = 0.4,
    private readonly speedCutoff = 1,
  ) {}

  reset(): void {
    this.value = null;
  }

  filter(raw: number, timeMs: number): number {
    if (this.value === null) {
      this.value = raw;
      this.last = timeMs;
      return raw;
    }
    const dt = Math.max(1e-3, (timeMs - this.last) / 1000);
    this.last = timeMs;
    const alpha = (cutoff: number) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
    const rawSpeed = (raw - this.value) / dt;
    this.speed += alpha(this.speedCutoff) * (rawSpeed - this.speed);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.speed);
    this.value += alpha(cutoff) * (raw - this.value);
    return this.value;
  }
}
