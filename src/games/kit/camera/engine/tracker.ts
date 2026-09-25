import { deriveBody, type Body } from "./body";
import type { Baseline } from "./calibration";
import { MoveReader, type MoveEvent, type MoveState } from "./gestures/moves";
import type { MoveTuning } from "./gestures/options";
import { LM, UPPER_POINTS, visibilityOf, type Pose } from "./landmarks";
import { SlotAssigner } from "./slots";
import { DEFAULT_SMOOTHING, LandmarkSmoother, type SmoothingOptions } from "./smoothing";

export interface TrackerOptions {
  /** Player slots, 1 or 2. */
  slots: number;
  moves?: MoveTuning;
  smoothing?: SmoothingOptions;
  /** People seen less clearly than this, 0 to 1, are ignored, which drops the model's odd ghost. */
  minConfidence?: number;
  /** A player missing for less than this keeps their last body, so one dropped frame is not "away". */
  graceMs?: number;
}

/** One tracked frame: every slot's body and moves, and what happened this frame. */
export interface TrackFrame {
  time: number;
  aspect: number;
  /** Index 0 is player one. Null when that player is not in view. */
  bodies: (Body | null)[];
  moves: MoveState[];
  events: MoveEvent[];
}

/** Shoulders narrower than this, in frame heights, are someone far behind the players. */
const MIN_SHOULDERS = 0.03;
/**
 * A jump can carry the head out of the top of the picture, and the model
 * may lose the player for a moment. A player lost mid jump is waited for
 * this long, instead of the usual grace, before they count as away.
 */
const JUMP_GRACE_MS = 700;

/**
 * The pure heart of tracking: people in, players out. Each frame it sorts
 * the model's people into player slots, smooths them, measures their
 * bodies and reads their moves. No browser needed, so it is unit tested.
 */
export class PoseTracker {
  private readonly assigner: SlotAssigner;
  private readonly smoothers: LandmarkSmoother[];
  private readonly readers: MoveReader[];
  private readonly bodies: (Body | null)[];
  private readonly missingSince: (number | null)[];
  private readonly minConfidence: number;
  private readonly graceMs: number;

  constructor(readonly options: TrackerOptions) {
    const count = options.slots;
    this.assigner = new SlotAssigner({ slots: count });
    this.smoothers = Array.from({ length: count }, () => new LandmarkSmoother(options.smoothing ?? DEFAULT_SMOOTHING));
    this.readers = Array.from({ length: count }, (_, i) => new MoveReader(i + 1, options.moves));
    this.bodies = Array.from({ length: count }, () => null);
    this.missingSince = Array.from({ length: count }, () => null);
    this.minConfidence = options.minConfidence ?? 0.5;
    this.graceMs = options.graceMs ?? 250;
  }

  get slots(): number {
    return this.options.slots;
  }

  setBaseline(slot: number, baseline: Baseline | null): void {
    this.readers[slot - 1]?.setBaseline(baseline);
  }

  baseline(slot: number): Baseline | null {
    return this.readers[slot - 1]?.calibration ?? null;
  }

  configure(tuning: MoveTuning): void {
    for (const reader of this.readers) reader.configure(tuning);
  }

  /**
   * One frame. `overrides` puts a pose straight into a slot, or empties it
   * with null, skipping the slot sorting. The test hooks use it.
   */
  update(poses: readonly Pose[], time: number, aspect: number, overrides?: ReadonlyMap<number, Pose | null>): TrackFrame {
    const people = poses.filter((pose) => this.usable(pose, aspect));
    // The shoulders, not the hips, since players stand waist up and the hips are often out of view.
    const centers = people.map((pose) => (pose.landmarks[LM.leftShoulder]!.x + pose.landmarks[LM.rightShoulder]!.x) / 2);
    const picked = this.assigner.assign(centers, time);
    const events: MoveEvent[] = [];
    for (let i = 0; i < this.slots; i++) {
      const slot = i + 1;
      const person = picked[i];
      const pose = overrides?.has(slot) ? overrides.get(slot)! : person !== null && person !== undefined ? people[person]! : null;
      this.bodies[i] = this.follow(i, pose, time, aspect);
      events.push(...this.readers[i]!.update(this.bodies[i]!, time));
    }
    return { time, aspect, bodies: [...this.bodies], moves: this.readers.map((r) => r.current), events };
  }

  /** The latest bodies without tracking a new frame. */
  latest(): (Body | null)[] {
    return [...this.bodies];
  }

  private follow(i: number, pose: Pose | null, time: number, aspect: number): Body | null {
    const previous = this.bodies[i] ?? null;
    if (!pose) {
      this.missingSince[i] ??= time;
      const grace = this.readers[i]!.current.jumping ? JUMP_GRACE_MS : this.graceMs;
      if (previous && time - this.missingSince[i]! < grace) return previous;
      this.smoothers[i]!.reset();
      return null;
    }
    this.missingSince[i] = null;
    // A player coming back starts fresh, so the filters never glide them in from where they left.
    if (!previous) this.smoothers[i]!.reset();
    const smoothed = this.smoothers[i]!.smooth(pose, time);
    return deriveBody(smoothed, time, aspect, previous);
  }

  private usable(pose: Pose, aspect: number): boolean {
    // Only the head and shoulders count, so a player seen from the waist up is a player.
    if (visibilityOf(pose.landmarks, UPPER_POINTS) < this.minConfidence) return false;
    const [a, b] = [pose.landmarks[LM.leftShoulder]!, pose.landmarks[LM.rightShoulder]!];
    return Math.hypot((a.x - b.x) * aspect, a.y - b.y) >= MIN_SHOULDERS;
  }
}
