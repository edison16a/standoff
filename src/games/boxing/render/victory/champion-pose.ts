/**
 * The winner lifting the belt, as a timeline in seconds from the start
 * of the ceremony. First the belt is held proudly at the chest, then it
 * is driven up over the head, then it is held high with a pump of the
 * arms now and then, the way champions do it for the cameras. Pure
 * numbers, so the timing can be tested.
 */

/** Held at the chest, then the lift, then held high. */
export const HOLD_S = 1.1;
export const LIFT_S = 0.9;

export interface ChampionFrame {
  /** 0 at the chest to 1 overhead. */
  lift: number;
  /** A small extra push up, 0 to 1, for the pumps once overhead. */
  pump: number;
  /** The body turning to show the belt round the arena, radians. */
  turn: number;
}

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

export function championFrame(t: number): ChampionFrame {
  // An overshoot as the arms lock out, like a real press over the head.
  const rise = smooth((t - HOLD_S) / LIFT_S);
  const lockout = Math.sin(Math.min(1, Math.max(0, (t - HOLD_S - LIFT_S) / 0.5)) * Math.PI) * 0.08;
  const high = Math.max(0, t - HOLD_S - LIFT_S);
  // A pump every two seconds or so once it is up: a short push then back.
  const cycle = (high % 2.2) / 2.2;
  const pump = high > 0.6 && cycle < 0.3 ? Math.sin((cycle / 0.3) * Math.PI) : 0;
  return {
    lift: Math.min(1.08, rise + lockout),
    pump,
    turn: high > 0 ? Math.sin(high * 0.45) * 0.35 : 0,
  };
}
