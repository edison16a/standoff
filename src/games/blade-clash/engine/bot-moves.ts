import { blendControl, GUARD, type SwordControl } from "./sword";

/** One attack as the computer plays it: a wind up, the strike itself, and the way back to guard. */
export interface Attack {
  name: string;
  /** Where the blade is drawn back to before the strike. */
  from: SwordControl;
  /** Where the strike ends. */
  to: SwordControl;
  windUpMs: number;
  strikeMs: number;
}

const hold = (yaw: number, pitch: number, reach: number, roll = 0): SwordControl => ({ yaw, pitch, roll, reach });

/**
 * The computer's attacks, each one a swing a person could make with the
 * phone: a cut from either side, one from overhead, one rising from low,
 * and a straight thrust.
 */
export const ATTACKS: readonly Attack[] = [
  { name: "cut from the right", from: hold(1.2, 0.45, 0.3, 0.3), to: hold(-0.95, 0.05, 0.85, 0.3), windUpMs: 300, strikeMs: 170 },
  { name: "cut from the left", from: hold(-1.1, 0.5, 0.3, -0.3), to: hold(0.95, 0.1, 0.85, -0.3), windUpMs: 320, strikeMs: 170 },
  { name: "overhead", from: hold(0.1, 1.4, 0.2), to: hold(0, -0.45, 0.9), windUpMs: 340, strikeMs: 180 },
  { name: "rising cut", from: hold(0.7, -1, 0.2, 0.5), to: hold(-0.3, 0.9, 0.8, 0.5), windUpMs: 300, strikeMs: 180 },
  { name: "thrust", from: hold(0.05, 0.55, 0), to: hold(0, 0.02, 1), windUpMs: 220, strikeMs: 130 },
];

/** Time from the end of a strike back to a resting guard. */
export const RECOVER_MS = 320;

/** How long an attack takes from its first frame back to guard. */
export function attackLength(attack: Attack): number {
  return attack.windUpMs + attack.strikeMs + RECOVER_MS;
}

/**
 * The hold `elapsed` ms into an attack that started from `start`. The wind
 * up eases in and out, the strike speeds up all the way through like a
 * real cut, and the recovery drifts back to guard.
 */
export function attackHold(attack: Attack, start: SwordControl, elapsed: number): SwordControl {
  const { windUpMs, strikeMs } = attack;
  if (elapsed < windUpMs) return blendControl(start, attack.from, smooth(elapsed / windUpMs));
  if (elapsed < windUpMs + strikeMs) {
    const k = (elapsed - windUpMs) / strikeMs;
    return blendControl(attack.from, attack.to, k * k);
  }
  const back = Math.min(1, (elapsed - windUpMs - strikeMs) / RECOVER_MS);
  return blendControl(attack.to, GUARD, smooth(back));
}

function smooth(k: number): number {
  const c = Math.min(1, Math.max(0, k));
  return c * c * (3 - 2 * c);
}
