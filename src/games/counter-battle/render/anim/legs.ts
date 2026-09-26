import type { P3 } from "./curves";

/**
 * The lower body as numbers that blend: the pelvis and where each ankle
 * goes, in the fighter's own space (x to their left, z ahead, metres).
 * The animator solves the legs to reach the ankles, so a blend between
 * standing, running and kneeling never bends a knee the wrong way.
 */
export interface LegFrame {
  hipY: number;
  hipX: number;
  hipZ: number;
  hipPitch: number;
  hipRoll: number;
  hipYaw: number;
  footL: [number, number, number];
  footR: [number, number, number];
  /** Foot pitch: positive tips the toes down and the heel up. */
  toeL: number;
  toeR: number;
  /** Which way each knee points. */
  poleL: [number, number, number];
  poleR: [number, number, number];
}

export function blankLegs(): LegFrame {
  return { hipY: 0, hipX: 0, hipZ: 0, hipPitch: 0, hipRoll: 0, hipYaw: 0, footL: [0, 0, 0], footR: [0, 0, 0], toeL: 0, toeR: 0, poleL: [0, 0, 1], poleR: [0, 0, 1] };
}

const mix3 = (a: P3, b: P3, t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Writes a blend a share `t` of the way from `a` to `b` into `out`. */
export function blendLegs(out: LegFrame, a: LegFrame, b: LegFrame, t: number): LegFrame {
  for (const k of ["hipY", "hipX", "hipZ", "hipPitch", "hipRoll", "hipYaw", "toeL", "toeR"] as const) out[k] = a[k] + (b[k] - a[k]) * t;
  out.footL = mix3(a.footL, b.footL, t);
  out.footR = mix3(a.footR, b.footR, t);
  out.poleL = mix3(a.poleL, b.poleL, t);
  out.poleR = mix3(a.poleR, b.poleR, t);
  return out;
}

/** Standing ready: feet apart, the right foot back in a shooter's stance, knees soft. */
export function standLegs(s: number, ankle: number, breath: number): LegFrame {
  const f = blankLegs();
  f.hipY = 0.915 * s + breath * 0.004;
  f.hipYaw = -0.12;
  f.footL = [0.13 * s, ankle, 0.1 * s];
  f.footR = [-0.13 * s, ankle, -0.12 * s];
  f.poleL = [0.3, 0, 1];
  f.poleR = [-0.3, 0, 1];
  return f;
}

/**
 * Kneeling behind low cover: sitting back on the right heel with that
 * knee down on the turf and the toes tucked under, the left foot planted
 * ahead. Low enough, with the back hunched, that the head sits where the
 * engine's crouched hit box puts it.
 */
export function kneelLegs(s: number, ankle: number): LegFrame {
  const f = blankLegs();
  f.hipY = 0.36 * s;
  f.hipZ = -0.02 * s;
  f.hipPitch = 0.2;
  f.hipYaw = -0.2;
  f.footL = [0.17 * s, ankle, 0.38 * s];
  f.footR = [-0.13 * s, 0.1 * s, -0.12 * s];
  f.toeR = 1.3;
  f.poleL = [0.25, 0.4, 1];
  f.poleR = [0, -0.2, 1];
  return f;
}

/**
 * Running: each foot swings forward in the air and then drives back
 * along the ground, along the way the body is moving, which may be to
 * the side or backwards while the body faces the fight. `phase` counts
 * whole strides; `dir` is the travel direction in the body's own space.
 */
export function runLegs(s: number, ankle: number, phase: number, speed: number, dir: { x: number; z: number }): LegFrame {
  const f = blankLegs();
  const pace = Math.min(1, speed / 5.5);
  const reach = Math.min(0.4 * s, (1.2 + 0.32 * speed) / 4) * (0.35 + 0.65 * pace);
  const lift = (0.1 + 0.12 * pace) * s;
  const side = (q: number, x: number): [number, number, number, number] => {
    const a = Math.cos(q * Math.PI * 2);
    const up = Math.max(0, -Math.sin(q * Math.PI * 2));
    // The swinging foot tucks up behind before reaching forward.
    const tuck = up * Math.max(0, -a) * 0.5;
    const along = reach * a - tuck * reach;
    // Toes down pushing off behind, toes up reaching forward to land on the heel.
    return [x + dir.x * along, ankle + lift * up, 0.02 * s + dir.z * along, up * (a < 0 ? 0.6 : -0.3)];
  };
  const q = phase - Math.floor(phase);
  const l = side(q, 0.11 * s);
  const r = side((q + 0.5) % 1, -0.11 * s);
  f.footL = [l[0], l[1], l[2]];
  f.footR = [r[0], r[1], r[2]];
  f.toeL = l[3];
  f.toeR = r[3];
  // The pelvis dips as each foot takes the weight and swings with the stride.
  const bob = Math.abs(Math.cos(q * Math.PI * 2));
  f.hipY = (0.9 - 0.035 * pace - 0.03 * pace * bob) * s;
  f.hipYaw = Math.cos(q * Math.PI * 2) * 0.14 * pace * Math.sign(dir.z || 1);
  f.hipPitch = 0.1 * pace * dir.z;
  f.hipRoll = -0.08 * pace * dir.x;
  f.poleL = [0.2, 0, 1];
  f.poleR = [-0.2, 0, 1];
  return f;
}
