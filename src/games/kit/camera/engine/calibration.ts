import type { Body } from "./body";
import { span, type Point } from "./geometry";
import { LM } from "./landmarks";
import { centreOf, checkSpot, DEFAULT_SPOT_RULES, type Spot, type SpotIssue, type SpotRules } from "./spots";

/**
 * How one player stands when standing tall and still in their spot, seen
 * from the waist up. Its heart is the head line: the resting height of
 * the head. Jumps and ducks are the head leaving a band around it, in the
 * player's own shoulder widths, so a child near the camera and an adult
 * far back read alike.
 */
export interface Baseline {
  slot: number;
  /** The middle of the head and shoulders across the mirrored picture. The player's home lane. */
  centerX: number;
  /** The head line: the head's resting height down the picture, 0 at the top, averaged while still. */
  headY: number;
  shoulderY: number;
  /** How far the head naturally sits right of the hips, in torso lengths. */
  headOffset: number;
  /** In frame heights, as if facing the camera. The unit for the head line and the lanes. */
  shoulderWidth: number;
  scale: number;
  /** Shoulder to wrist along the arm, in torso lengths as the picture shows it. */
  armLength: number;
  aspect: number;
}

export interface CalibrationOptions {
  /** How long the player must hold still, in milliseconds. */
  holdMs: number;
  /** Faster than this, in torso lengths per second, counts as moving. */
  stillSpeed: number;
  /** Fewest frames to average, for slow machines that track only a few frames a second. */
  minSamples: number;
  rules: SpotRules;
}

export const DEFAULT_CALIBRATION: CalibrationOptions = { holdMs: 1500, stillSpeed: 0.35, minSamples: 4, rules: DEFAULT_SPOT_RULES };

export type CalibrationPhase = "find" | "hold" | "done";

export interface CalibrationProgress {
  phase: CalibrationPhase;
  /** How full the ring is, 0 to 1. */
  progress: number;
  issue: SpotIssue | "moving" | null;
  baseline: Baseline | null;
}

/**
 * Frames further apart than this count as this long, so one stall never
 * fills the ring. It is generous enough for a slow machine tracking only
 * a few frames a second, which still needs `minSamples` frames.
 */
const MAX_STEP_MS = 400;
/** The head moving more than this between samples, in torso lengths, is moving whatever the frame rate. */
const MAX_DRIFT = 0.12;
const DEFAULT_ARM = 1.1;

/**
 * Watches one player until they have stood still in their spot for long
 * enough, then averages what it saw into their baseline. Moving drains
 * the ring instead of emptying it, since tracking wobbles a little.
 */
export class BaselineCollector {
  private readonly options: CalibrationOptions;
  private held = 0;
  private samples: Baseline[] = [];
  private last: number | null = null;
  private lastHead: Point | null = null;
  private result: Baseline | null = null;

  constructor(
    private readonly spot: Spot,
    options: Partial<CalibrationOptions> = {},
  ) {
    this.options = { ...DEFAULT_CALIBRATION, ...options };
  }

  reset(): void {
    this.held = 0;
    this.samples = [];
    this.last = null;
    this.lastHead = null;
    this.result = null;
  }

  update(body: Body | null, time: number): CalibrationProgress {
    if (this.result) return { phase: "done", progress: 1, issue: null, baseline: this.result };
    const step = this.last === null ? 0 : Math.min(MAX_STEP_MS, Math.max(0, time - this.last));
    this.last = time;
    const issue = checkSpot(body, this.spot, this.options.rules);
    if (issue || !body) {
      this.held = 0;
      this.samples = [];
      this.lastHead = null;
      return { phase: "find", progress: 0, issue, baseline: null };
    }
    const speed = Math.max(Math.hypot(body.velocity.torso.x, body.velocity.torso.y), Math.hypot(body.velocity.head.x, body.velocity.head.y));
    // Velocities need frames close together. On a slow machine, how far the head moved since the last sample tells instead.
    const before = this.lastHead;
    this.lastHead = body.head;
    const drift = before ? Math.hypot(((body.head.x - before.x) * body.aspect) / body.scale, (body.head.y - before.y) / body.scale) : 0;
    if (speed > this.options.stillSpeed || drift > MAX_DRIFT) {
      const before = this.held;
      this.held = Math.max(0, this.held - step * 2);
      this.samples = before > 0 ? this.samples.slice(-Math.ceil((this.samples.length * this.held) / before)) : [];
      if (!this.held) this.samples = [];
      return { phase: "hold", progress: this.held / this.options.holdMs, issue: "moving", baseline: null };
    }
    this.held += step;
    this.samples.push(sampleOf(body, this.spot.slot));
    if (this.held >= this.options.holdMs && this.samples.length >= this.options.minSamples) {
      this.result = average(this.samples);
      return { phase: "done", progress: 1, issue: null, baseline: this.result };
    }
    return { phase: "hold", progress: Math.min(0.99, this.held / this.options.holdMs), issue: null, baseline: null };
  }
}

/** One frame's worth of a baseline. Exported for tests and for games that build their own. */
export function sampleOf(body: Body, slot: number): Baseline {
  return {
    slot,
    centerX: centreOf(body),
    headY: body.head.y,
    shoulderY: body.shoulders.y,
    headOffset: ((body.head.x - body.hips.x) * body.aspect) / body.scale,
    shoulderWidth: body.shoulderWidth,
    scale: body.scale,
    armLength: armLength(body),
    aspect: body.aspect,
  };
}

/** Upper arm plus forearm in the picture, which bending does not change. The clearer arm counts. */
function armLength(body: Body): number {
  const lengths: number[] = [];
  for (const [s, e, w] of [
    [LM.leftShoulder, LM.leftElbow, LM.leftWrist],
    [LM.rightShoulder, LM.rightElbow, LM.rightWrist],
  ] as const) {
    const [a, b, c] = [body.landmarks[s]!, body.landmarks[e]!, body.landmarks[w]!];
    if (Math.min(a.visibility, b.visibility, c.visibility) < 0.5) continue;
    lengths.push((span(a, b, body.aspect) + span(b, c, body.aspect)) / body.scale);
  }
  return lengths.length ? Math.max(...lengths) : DEFAULT_ARM;
}

function average(samples: readonly Baseline[]): Baseline {
  const first = samples[0]!;
  const mean = (pick: (b: Baseline) => number) => samples.reduce((sum, b) => sum + pick(b), 0) / samples.length;
  return {
    slot: first.slot,
    centerX: mean((b) => b.centerX),
    headY: mean((b) => b.headY),
    shoulderY: mean((b) => b.shoulderY),
    headOffset: mean((b) => b.headOffset),
    shoulderWidth: mean((b) => b.shoulderWidth),
    scale: mean((b) => b.scale),
    armLength: mean((b) => b.armLength),
    aspect: first.aspect,
  };
}
