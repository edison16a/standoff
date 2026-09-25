import { DEG } from "@/games/kit/motion/math3d";
import type { GestureSample } from "./gesture";

/**
 * Synthetic motion for the gesture tests. A motion is the blade's angles
 * over time plus any extra shaking. The turn rate and the acceleration a
 * moving blade makes are worked out from the angles, so a slow raise is
 * as gentle in the trace as it would be in the hand.
 */

export const SAMPLE_MS = 1000 / 60;
/** Distance from the shoulder to the phone, m: turning the arm moves the phone this far per radian. */
const ARM = 0.6;

export type Signal = (t: number) => number;

export const none: Signal = () => 0;

/** Half a sine wave from `start` lasting `ms`, peaking at `amp`. */
export function pulse(start: number, ms: number, amp: number): Signal {
  return (t) => (t >= start && t <= start + ms ? amp * Math.sin((Math.PI * (t - start)) / ms) : 0);
}

export function sum(...signals: Signal[]): Signal {
  return (t) => signals.reduce((total, signal) => total + signal(t), 0);
}

/** An eased move from `from` to `to` degrees, starting at `start` and taking `ms`. */
export function ease(start: number, ms: number, from: number, to: number): Signal {
  return (t) => {
    const k = Math.min(1, Math.max(0, (t - start) / ms));
    return (from + (to - from) * (1 - Math.cos(Math.PI * k)) / 2) * DEG;
  };
}

/** Slow wandering around the guard, `deg` either way, the way a hand drifts while aiming. */
export function wander(deg: number, periodMs: number, phase = 0): Signal {
  return (t) => deg * DEG * Math.sin((2 * Math.PI * t) / periodMs + phase);
}

/** A back and forth shake: `amp` at its fastest, `hz` swings a second, for `ms`. */
export function shake(start: number, ms: number, amp: number, hz = 5): Signal {
  return (t) => (t >= start && t <= start + ms ? Math.abs(amp * Math.sin(2 * Math.PI * hz * ((t - start) / 1000))) : 0);
}

/** A quick jab: the push, then the arm braking. As a size, both are positive. */
export function thrust(start: number, amp: number): Signal {
  return sum(pulse(start, 90, amp), pulse(start + 90, 130, amp * 0.85));
}

export interface Motion {
  /** Blade angles in radians. */
  pitch?: Signal;
  yaw?: Signal;
  /** Extra acceleration (m/s²) and turn (rad/s) on top of what the angles make. */
  accel?: Signal;
  spin?: Signal;
}

/** Samples a motion from `from` for `ms`, at 60 Hz. */
export function trace(motion: Motion, ms: number, from = 0): GestureSample[] {
  const { pitch = none, yaw = none, accel = none, spin = none } = motion;
  const h = 1;
  const rate = (f: Signal, t: number) => (f(t + h) - f(t - h)) / (2 * h / 1000);
  const curve = (f: Signal, t: number) => (f(t + h) - 2 * f(t) + f(t - h)) / (h / 1000) ** 2;
  const samples: GestureSample[] = [];
  for (let t = from; t < from + ms; t += SAMPLE_MS) {
    const turn = Math.hypot(rate(pitch, t), rate(yaw, t));
    const push = Math.hypot(curve(pitch, t), curve(yaw, t)) * ARM;
    samples.push({ t, pitch: pitch(t), yaw: yaw(t), accel: push + accel(t), spin: turn + spin(t) });
  }
  return samples;
}
