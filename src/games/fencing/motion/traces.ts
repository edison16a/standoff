import type { StrikeSample } from "./strike-detector";

/**
 * Synthetic sensor traces for the strike tests. Each motion is a sum of
 * smooth pulses, the shape a real arm makes: a push, then the brake.
 */

export const SAMPLE_MS = 1000 / 60;

type Signal = (t: number) => number;

/** Half a sine wave from `start` lasting `ms`, peaking at `amp`. */
export function pulse(start: number, ms: number, amp: number): Signal {
  return (t) => (t >= start && t <= start + ms ? amp * Math.sin((Math.PI * (t - start)) / ms) : 0);
}

export function sum(...signals: Signal[]): Signal {
  return (t) => signals.reduce((total, signal) => total + signal(t), 0);
}

export const none: Signal = () => 0;

export interface Motion {
  down?: Signal;
  forward?: Signal;
  /** Blade tip rise rate in rad/s, or null for a phone with no gyroscope. */
  pitchRate?: Signal | null;
}

/** Samples a motion from `from` for `ms`, at 60 Hz unless `step` says otherwise. */
export function trace(motion: Motion, ms: number, from = 0, step = SAMPLE_MS): StrikeSample[] {
  const samples: StrikeSample[] = [];
  const { down = none, forward = none, pitchRate = none } = motion;
  for (let t = from; t < from + ms; t += step) {
    samples.push({ t, down: down(t), forward: forward(t), pitchRate: pitchRate ? pitchRate(t) : null });
  }
  return samples;
}

/** A chop down: a push down, then the arm braking, which pushes up. */
export function chop(start: number, amp: number, brake = 0.85): Signal {
  return sum(pulse(start, 90, amp), pulse(start + 90, 130, -amp * brake));
}

/** A lift: a push up, then the brake, which pushes down. */
export function lift(start: number, amp: number, brake = 0.85): Signal {
  return sum(pulse(start, 90, -amp), pulse(start + 90, 130, amp * brake));
}

/** The wrist turning the tip down (negative) or up through a strike, slowing to a stop. */
export function flick(start: number, rate: number, ms = 200): Signal {
  return pulse(start, ms, rate);
}
