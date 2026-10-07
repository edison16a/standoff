import { RIM_SPOT, rimDistance } from "./court";
import type { Match } from "./match";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/**
 * The dribble presets. Each is a hand made way of carrying the ball:
 * where the palm works it (height as a share of the body, ahead and out
 * to the side in metres) and how quick the bounce is against the feet.
 * The live dribble is a blend of them, weighed by speed, the way the
 * body travels and how close a defender is, so the ball goes low and
 * tight the moment a player sprints and is shielded when he is pressed.
 */
export interface DribbleStyle {
  /** The palm's height as a share of the player's height. */
  palm: number;
  /** How far ahead of the hips the ball is worked, metres. */
  fwd: number;
  /** How far out to the side, metres. */
  out: number;
  /** Bounce rate against the plain rhythm of the feet. */
  rate: number;
  /** 0 to 1: how far down over the ball the body sinks, for the animation. */
  low: number;
}

export const DRIBBLE_STYLES = {
  /** Standing: the low, hard pound in a crouch. */
  pound: { palm: 0.41, fwd: 0.26, out: 0.3, rate: 1, low: 0.3 },
  /** Jogging up the floor: tall, at the hip. */
  jog: { palm: 0.46, fwd: 0.26, out: 0.3, rate: 1, low: 0 },
  /** Sprinting: low and tight, out in front so the run never waits on it. */
  sprint: { palm: 0.35, fwd: 0.33, out: 0.21, rate: 1.05, low: 0.8 },
  /** Sprinting at the rim: lower still, the shoulders over it. */
  drive: { palm: 0.32, fwd: 0.31, out: 0.19, rate: 1.1, low: 1 },
  /** Backing up off a defender: low at the side, quick. */
  retreat: { palm: 0.37, fwd: 0.1, out: 0.32, rate: 1.15, low: 0.6 },
  /** A defender in his chest: low on the far hip, the body between the man and the ball. */
  protect: { palm: 0.36, fwd: 0.06, out: 0.37, rate: 1.2, low: 0.7 },
} as const satisfies Record<string, DribbleStyle>;

export type DribbleStyleId = keyof typeof DRIBBLE_STYLES;
export type DribbleWeights = Record<DribbleStyleId, number>;

/** Closer than this a defender starts to make the handler protect the ball. */
const PRESS_FROM = 1.9;
const PRESS_FULL = 0.9;
/** Seconds for the dribble to settle into a new blend: quick, but never a snap. */
const SETTLE = 0.12;

/**
 * How much of each preset the dribble should be now. Speed moves it from
 * the pound through the jog to the sprint; running backward it becomes
 * the retreat; a sprint at the rim is the drive; and a defender close by
 * takes a share of all of it into the protect.
 */
export function styleWeights(speed: number, along: number, atRim: boolean, nearest: number): DribbleWeights {
  const still = 1 - clamp(speed / 1.4, 0, 1);
  const fast = clamp((speed - 2.8) / 1.6, 0, 1);
  const back = clamp(-along / Math.max(0.5, speed), 0, 1) * (1 - still);
  const ahead = (1 - still) * (1 - back);
  const w: DribbleWeights = {
    pound: still,
    jog: ahead * (1 - fast),
    sprint: ahead * fast * (atRim ? 0 : 1),
    drive: ahead * fast * (atRim ? 1 : 0),
    retreat: back,
    protect: 0,
  };
  const press = clamp((PRESS_FROM - nearest) / (PRESS_FROM - PRESS_FULL), 0, 1) * (1 - fast * 0.6);
  for (const k of Object.keys(w) as DribbleStyleId[]) w[k] *= 1 - press;
  w.protect = press;
  return w;
}

/** The blended preset for a set of weights. */
export function blendStyles(w: DribbleWeights): DribbleStyle {
  const out: DribbleStyle = { palm: 0, fwd: 0, out: 0, rate: 0, low: 0 };
  let total = 0;
  for (const k of Object.keys(w) as DribbleStyleId[]) {
    const s = DRIBBLE_STYLES[k];
    const k2 = w[k];
    total += k2;
    out.palm += s.palm * k2;
    out.fwd += s.fwd * k2;
    out.out += s.out * k2;
    out.rate += s.rate * k2;
    out.low += s.low * k2;
  }
  if (total <= 1e-6) return { ...DRIBBLE_STYLES.pound };
  for (const k of ["palm", "fwd", "out", "rate", "low"] as const) out[k] /= total;
  return out;
}

/** What the handler sees this step: his speed, how much of it is forward, the rim, and the nearest man. */
function read(m: Match, a: Athlete): DribbleWeights {
  const speed = Math.hypot(a.vx, a.vz);
  const along = a.vx * Math.sin(a.yaw) + a.vz * Math.cos(a.yaw);
  const dx = RIM_SPOT.x - a.x;
  const dz = RIM_SPOT.z - a.z;
  const atRim = rimDistance(a) < 7 && speed > 0.5 && (a.vx * dx + a.vz * dz) / (speed * Math.hypot(dx, dz)) > 0.6;
  let nearest = 99;
  for (const o of m.opponents(a.team)) nearest = Math.min(nearest, Math.hypot(o.x - a.x, o.z - a.z));
  return styleWeights(speed, along, atRim, nearest);
}

/** Eases the handler's dribble toward the blend the moment asks for. */
export function updateDribbleStyle(m: Match, a: Athlete, dt: number): void {
  const want = blendStyles(read(m, a));
  const k = 1 - Math.exp(-dt / SETTLE);
  const s = a.dribbleStyle;
  for (const c of ["palm", "fwd", "out", "rate", "low"] as const) s[c] += (want[c] - s[c]) * k;
}

/** A fresh player's dribble: the jog, until the first step reads the floor. */
export const freshStyle = (): DribbleStyle => ({ ...DRIBBLE_STYLES.jog });
