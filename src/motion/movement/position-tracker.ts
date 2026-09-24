import type { Tuning } from "@/shared/tuning";
import { shapeIntent, type MovementSample, type MovementSource } from "./movement-source";
import { StillnessDetector } from "./stillness-detector";

/** Longest step we integrate over. A longer gap means the tab was asleep. */
const MAX_DT_S = 0.05;
/** The arm only reaches so far, so the tracked offset stops here. */
const MAX_OFFSET_M = 0.5;
/**
 * A gentle leak on velocity (not position) while the phone is moving.
 * It trims the slow creep that sensor bias adds between still moments and
 * does not pull a held position back toward centre.
 */
const VELOCITY_LEAK_PER_S = 0.6;
/** How far back the offset history reaches. Longer than any strike's rise. */
const HISTORY_MS = 400;

/**
 * Footwork from where the arm actually is. Forward acceleration is
 * integrated twice into an offset from where the exchange started. Push
 * the phone out and hold it there, and the fencer keeps advancing at a
 * steady pace for as long as you hold.
 *
 * Two things keep drift in check. Zero velocity updates: whenever the
 * phone has been still for a moment, velocity snaps to zero, so noise
 * cannot build into speed while the arm is held. And recentering at every
 * en garde, which caps whatever drift remains to one exchange.
 */
export class PositionTracker implements MovementSource {
  private position = 0;
  private velocity = 0;
  private lastT: number | null = null;
  private holdUntil = -Infinity;
  private heldPosition = 0;
  /** Recent offsets, so a strike can be rewound to where it started. */
  private readonly history: { t: number; position: number }[] = [];
  private readonly stillness: StillnessDetector;
  private deadzone: number;
  private fullScale: number;

  constructor(tuning: Tuning) {
    this.stillness = new StillnessDetector(tuning.stillnessThreshold, tuning.stillnessMs);
    this.deadzone = tuning.moveDeadzoneM;
    this.fullScale = tuning.moveFullScaleM;
  }

  configure(tuning: Tuning): void {
    this.stillness.configure(tuning.stillnessThreshold, tuning.stillnessMs);
    this.deadzone = tuning.moveDeadzoneM;
    this.fullScale = tuning.moveFullScaleM;
  }

  /** The tracked offset in metres, exposed for the phone's meter and tests. */
  get offset(): number {
    return this.position;
  }

  update(sample: MovementSample): number {
    const dt = this.lastT === null ? 0 : Math.min(MAX_DT_S, Math.max(0, (sample.t - this.lastT) / 1000));
    this.lastT = sample.t;
    const still = this.stillness.push(sample.t, sample.accelMagnitude);

    if (sample.t < this.holdUntil) {
      // A jab or parry is playing out. Its motion is not footwork.
      return this.intent();
    }
    if (this.holdUntil !== -Infinity) {
      this.position = this.heldPosition;
      this.velocity = 0;
      this.holdUntil = -Infinity;
    }

    if (still) {
      this.velocity = 0;
    } else {
      this.velocity += sample.forwardAccel * dt;
      this.velocity *= Math.max(0, 1 - VELOCITY_LEAK_PER_S * dt);
      this.position += this.velocity * dt;
    }
    if (Math.abs(this.position) > MAX_OFFSET_M) {
      this.position = Math.sign(this.position) * MAX_OFFSET_M;
      this.velocity = 0;
    }
    this.history.push({ t: sample.t, position: this.position });
    while (this.history.length > 0 && this.history[0]!.t < sample.t - HISTORY_MS) this.history.shift();
    return this.intent();
  }

  recenter(): void {
    this.position = 0;
    this.velocity = 0;
    this.heldPosition = 0;
    this.holdUntil = -Infinity;
    this.history.length = 0;
    this.stillness.reset();
  }

  /**
   * Freezes tracking until `untilMs`. The strike detector only fires once
   * the spike is well under way, so the tracker has already swallowed part
   * of the thrust. We rewind to the offset from `fromMs`, just before the
   * spike began, and resume from there once the strike has settled.
   */
  hold(fromMs: number, untilMs: number): void {
    if (this.holdUntil === -Infinity) {
      const before = [...this.history].reverse().find((entry) => entry.t <= fromMs);
      this.heldPosition = before ? before.position : this.position;
      this.position = this.heldPosition;
      this.velocity = 0;
    }
    this.holdUntil = Math.max(this.holdUntil, untilMs);
  }

  private intent(): number {
    return shapeIntent(this.position, this.deadzone, this.fullScale);
  }
}
