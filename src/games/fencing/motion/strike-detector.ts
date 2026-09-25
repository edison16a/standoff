import type { StrikeAction } from "@/games/fencing/protocol";

/** One reading, already turned into the directions that matter for fencing. */
export interface StrikeSample {
  /** Milliseconds. */
  t: number;
  /** Vertical acceleration in m/s², positive downward. */
  down: number;
  /** Horizontal acceleration toward the opponent, m/s². */
  forward: number;
  /** How fast the blade tip rises, rad/s, from the gyroscope. Null on phones without one. */
  pitchRate: number | null;
}

export interface StrikeSettings {
  jabThreshold: number;
  parryThreshold: number;
  refractoryMs: number;
}

/**
 * How big a strike has to be, as a share of the thresholds. 1 is the
 * host's setting. The practice step moves it for each player, so a gentle
 * mover and a wild one both land their jabs.
 */
export interface Sensitivity {
  jab: number;
  parry: number;
}

/** What the detector knows about the last strike, for the practice step. */
export interface StrikeReport {
  action: StrikeAction;
  t: number;
  /** The strongest score reached during the strike, in thresholds. */
  peak: number;
}

/** A strike has to climb from quiet to its level inside this window, which keeps slow aiming out. */
export const RISE_WINDOW_MS = 200;
/** Below this score the signal counts as quiet. */
const QUIET = 0.35;
/** The same strike cannot fire twice until its score drops back under this. */
const REARM = 0.5;
/**
 * A jab is a chop down, but most chops also travel a little toward the
 * screen. Reading along a line tipped this far forward catches angled
 * chops at full strength and a straight chop at nine tenths.
 */
const JAB_TILT = (25 * Math.PI) / 180;
/** A wrist flick this fast (rad/s, about 400 degrees a second) adds this much score. */
const GYRO_REF = 7;
const GYRO_GAIN = 0.6;
/**
 * A strike must also carry the phone somewhere: this much speed gained
 * (m/s), or this much turn (radians), or a mix. A thumb tapping the screen
 * gives a sharp spike but moves the phone almost nowhere.
 */
const MIN_SPEED = 0.3;
const MIN_TURN = 0.3;
/**
 * Every chop ends with the arm braking, which looks like a lift, and every
 * lift ends like a chop. The opposite strike therefore waits this much
 * longer than a repeat of the same one.
 */
export const OPPOSITE_EXTRA_MS = 120;
/**
 * A strike cannot start straight out of the other one. A chop too soft to
 * count as a jab still brakes like one, and that brake must not become a
 * parry. So a strike whose push began within this long of the other
 * strike's score being loud does not fire.
 */
const OPPOSITE_WINDOW_MS = 150;
/** A score this high (or the strike's own level, if lower) counts as loud. */
const LOUD = 0.7;
/** How long after firing the peak is still being measured. */
const PEAK_MS = 160;
/** Readings further apart than this are a gap in the stream, not a long sample. */
const MAX_DT_MS = 50;

interface Channel {
  action: StrikeAction;
  score: number;
  lastQuietAt: number;
  lastLoudAt: number;
  /** Speed and turn gathered since the score left quiet. */
  speed: number;
  turn: number;
  armed: boolean;
}

const channel = (action: StrikeAction): Channel => ({ action, score: 0, lastQuietAt: -Infinity, lastLoudAt: -Infinity, speed: 0, turn: 0, armed: true });

/**
 * Turns motion into jabs and parries. Each reading becomes two scores, one
 * per strike, measured in thresholds: acceleration along the strike's line,
 * plus a share of the gyroscope's blade turn when there is one. The turn
 * counts against the opposite strike, which is what tells the braking at
 * the end of a chop apart from a real lift: the blade is still turning down.
 *
 * A strike fires when its score climbs from quiet to its level quickly,
 * and the motion behind it actually moved the phone. After any strike the
 * detector stays quiet for a refractory period, a little longer for the
 * opposite strike, because that is what the rebound looks like.
 */
export class StrikeDetector {
  private readonly jab = channel("jab");
  private readonly parry = channel("parry");
  private previous: StrikeSample | null = null;
  private last: { action: StrikeAction; at: number } | null = null;
  private suppressedUntil = -Infinity;
  private report: StrikeReport | null = null;

  constructor(
    private settings: StrikeSettings,
    private sensitivity: Sensitivity = { jab: 1, parry: 1 },
  ) {}

  configure(settings: StrikeSettings): void {
    this.settings = settings;
  }

  setSensitivity(sensitivity: Sensitivity): void {
    this.sensitivity = sensitivity;
  }

  /** The last strike and how hard it was, once its peak has been measured. */
  get lastStrike(): StrikeReport | null {
    return this.report;
  }

  /** Each strike's score right now, in thresholds, for the practice step's meter. */
  get scores(): { jab: number; parry: number } {
    return { jab: this.jab.score, parry: this.parry.score };
  }

  /** Ignores strikes until then, used around taps on the screen. */
  suppressUntil(t: number): void {
    this.suppressedUntil = Math.max(this.suppressedUntil, t);
  }

  update(sample: StrikeSample): StrikeAction | null {
    const prev = this.previous;
    this.previous = sample;
    const dt = prev ? Math.min(MAX_DT_MS, Math.max(0, sample.t - prev.t)) / 1000 : 0;
    // Averaging with the previous reading shaves off single frame spikes.
    const avg = (a: number, b: number | undefined) => (b === undefined ? a : (a + b) / 2);
    const down = avg(sample.down, prev?.down);
    const forward = avg(sample.forward, prev?.forward);
    const rate = sample.pitchRate === null ? 0 : avg(sample.pitchRate, prev?.pitchRate ?? undefined);

    const jabAccel = down * Math.cos(JAB_TILT) + forward * Math.sin(JAB_TILT);
    const parryAccel = -down;
    const gyro = (GYRO_GAIN * rate) / GYRO_REF;
    this.feed(this.jab, jabAccel / this.settings.jabThreshold - gyro, jabAccel, -rate, sample.t, dt);
    this.feed(this.parry, parryAccel / this.settings.parryThreshold + gyro, parryAccel, rate, sample.t, dt);
    this.trackPeak(sample.t);

    const fired = this.ready(this.jab, sample.t) ? this.jab : this.ready(this.parry, sample.t) ? this.parry : null;
    if (!fired) return null;
    fired.armed = false;
    this.last = { action: fired.action, at: sample.t };
    this.report = { action: fired.action, t: sample.t, peak: fired.score };
    return fired.action;
  }

  reset(): void {
    for (const c of [this.jab, this.parry]) Object.assign(c, channel(c.action));
    this.previous = null;
    this.last = null;
    this.suppressedUntil = -Infinity;
  }

  private feed(c: Channel, score: number, accel: number, rate: number, t: number, dt: number): void {
    c.score = score;
    if (score < QUIET) {
      c.lastQuietAt = t;
      c.speed = 0;
      c.turn = 0;
    } else {
      c.speed += Math.max(0, accel) * dt;
      c.turn += Math.max(0, rate) * dt;
    }
    if (score < REARM) c.armed = true;
    if (score >= Math.min(LOUD, this.sensitivity[c.action])) c.lastLoudAt = t;
  }

  private ready(c: Channel, t: number): boolean {
    if (!c.armed || t < this.suppressedUntil) return false;
    if (c.score < this.sensitivity[c.action]) return false;
    if (t - c.lastQuietAt > RISE_WINDOW_MS) return false;
    if (c.speed / MIN_SPEED + c.turn / MIN_TURN < 1) return false;
    const other = c === this.jab ? this.parry : this.jab;
    if (c.lastQuietAt - other.lastLoudAt < OPPOSITE_WINDOW_MS) return false;
    if (!this.last) return true;
    const wait = this.settings.refractoryMs + (this.last.action === c.action ? 0 : OPPOSITE_EXTRA_MS);
    return t - this.last.at >= wait;
  }

  /** Keeps raising the last strike's peak while its push is still building. */
  private trackPeak(t: number): void {
    const report = this.report;
    if (!report || t - report.t > PEAK_MS) return;
    const c = report.action === "jab" ? this.jab : this.parry;
    if (c.score > report.peak) this.report = { ...report, peak: c.score };
  }
}
