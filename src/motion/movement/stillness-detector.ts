/**
 * Decides when the phone is being held still. It keeps a short window of
 * acceleration readings and calls the phone still once the RMS of that
 * window stays under the threshold for the whole window. RMS catches both
 * a steady push and a jittery hand, where variance alone would miss the
 * first.
 */
export class StillnessDetector {
  private readonly samples: { t: number; value: number }[] = [];

  constructor(
    private threshold: number,
    private windowMs: number,
  ) {}

  configure(threshold: number, windowMs: number): void {
    this.threshold = threshold;
    this.windowMs = windowMs;
  }

  /** Adds a reading and returns whether the phone counts as still now. */
  push(t: number, magnitude: number): boolean {
    this.samples.push({ t, value: magnitude });
    while (this.samples.length > 2 && this.samples[1]!.t <= t - this.windowMs) this.samples.shift();

    const first = this.samples[0]!;
    if (t - first.t < this.windowMs * 0.9) return false;
    let sumSquares = 0;
    for (const sample of this.samples) sumSquares += sample.value * sample.value;
    return Math.sqrt(sumSquares / this.samples.length) < this.threshold;
  }

  reset(): void {
    this.samples.length = 0;
  }
}
