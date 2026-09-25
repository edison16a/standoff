import { neutral, type Pose } from "./pose";

/**
 * The outfield players' moves, each a pose for a moment in time.
 * Kicks are drawn for the right foot and mirrored for left footers.
 */

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/** Swaps left and right, for left footed kicks. */
export function mirror(p: Pose): Pose {
  return {
    ...p,
    roll: -p.roll, yaw: -p.yaw, spineY: -p.spineY, spineZ: -p.spineZ, neckY: -p.neckY,
    shLX: p.shRX, shLY: p.shRY, shLZ: p.shRZ, elL: p.elR, shRX: p.shLX, shRY: p.shLY, shRZ: p.shLZ, elR: p.elL,
    hipLX: p.hipRX, hipLZ: p.hipRZ, kneeL: p.kneeR, ankL: p.ankR, hipRX: p.hipLX, hipRZ: p.hipLZ, kneeR: p.kneeL, ankR: p.ankL,
  };
}

/** Standing, weight on the balls of the feet, breathing. */
export function idle(time: number, phase: number): Pose {
  const p = neutral();
  const breath = Math.sin(time * 2.1 + phase);
  p.spineX = 0.04 + breath * 0.015;
  p.kneeL = p.kneeR = 0.14;
  p.hipLX = p.hipRX = -0.08;
  p.hipLZ = p.hipRZ = 0.06;
  p.lift = -0.012;
  p.shLZ = p.shRZ = 0.16 + breath * 0.02;
  p.neckX = -0.05;
  return p;
}

/**
 * The run: legs and arms swing in opposition, knees fold through the
 * swing, the body leans into the pace and bobs twice a stride.
 * `dribbling` shortens the stride and drops the head to the ball.
 */
export function run(stride: number, speed: number, dribbling: boolean): Pose {
  const p = neutral();
  const a = clamp01(speed / 7.5) * (dribbling ? 0.8 : 1);
  const phi = stride * TAU;
  const swing = 0.22 + 0.62 * a;
  p.hipLX = -Math.sin(phi) * swing - 0.1 * a;
  p.hipRX = Math.sin(phi) * swing - 0.1 * a;
  p.kneeL = 0.2 + (0.25 + 1.25 * a) * Math.max(0, Math.cos(phi - 0.5));
  p.kneeR = 0.2 + (0.25 + 1.25 * a) * Math.max(0, -Math.cos(phi - 0.5));
  p.ankL = 0.25 * Math.sin(phi) * a;
  p.ankR = -0.25 * Math.sin(phi) * a;
  p.shLX = Math.sin(phi) * (0.25 + 0.7 * a);
  p.shRX = -Math.sin(phi) * (0.25 + 0.7 * a);
  p.elL = p.elR = -(0.55 + 0.85 * a);
  p.shLZ = p.shRZ = dribbling ? 0.3 : 0.14;
  p.pitch = 0.04 + 0.16 * a;
  p.lift = -0.03 * a + 0.035 * a * Math.abs(Math.cos(phi));
  p.spineY = Math.sin(phi) * 0.14 * a;
  p.neckY = -p.spineY * 0.8;
  p.neckX = dribbling ? 0.28 : -0.05;
  return p;
}

/**
 * A shot. Wind up (the kicking leg drawn back, the other arm out for
 * balance), strike at `windup`, then follow through high with a hop.
 */
export function shoot(t: number, windup: number, power: number): Pose {
  const p = neutral();
  const back = smooth(t / windup);
  const strike = smooth((t - windup) / 0.1);
  const through = smooth((t - windup - 0.1) / 0.25);
  const settle = smooth((t - windup - 0.4) / 0.2);
  const reach = 0.9 + 0.7 * power;
  p.hipRX = 0.9 * back - (0.9 + reach * 0.8) * strike - 0.3 * power * through + (reach * 0.8 + 0.3 * power) * settle;
  p.kneeR = 1.5 * back - 1.35 * strike + 0.1 * through - 0.2 * settle;
  p.ankR = 0.5 * back - 0.3 * strike;
  p.hipLX = -0.3 * back + 0.35 * strike;
  p.kneeL = 0.35 * back - 0.1 * strike;
  p.shLX = -0.6 * back + 0.3 * strike;
  p.shLZ = 0.2 + 0.9 * back;
  p.shRX = 0.4 * back - 0.8 * strike;
  p.shRZ = 0.2 + 0.7 * back;
  p.elL = p.elR = -0.4;
  p.pitch = -0.12 * back + (0.18 + 0.1 * power) * strike - 0.2 * settle;
  p.spineY = -0.35 * back + 0.5 * strike;
  p.lift = 0.1 * power * Math.sin(Math.PI * clamp01((t - windup) / 0.35));
  p.neckX = 0.3 * back;
  return p;
}

/** A side foot pass: a short swing with the inside of the boot. */
export function pass(t: number, windup: number): Pose {
  const p = neutral();
  const back = smooth(t / windup);
  const strike = smooth((t - windup) / 0.1);
  const settle = smooth((t - windup - 0.18) / 0.15);
  p.hipRX = 0.45 * back - 0.95 * strike + 0.5 * settle;
  p.hipRZ = 0.35 * back;
  p.kneeR = 0.9 * back - 0.75 * strike;
  p.kneeL = 0.3;
  p.shLZ = 0.2 + 0.5 * back;
  p.shRZ = 0.2 + 0.4 * back;
  p.spineY = -0.2 * back + 0.25 * strike;
  p.pitch = 0.1;
  p.neckX = 0.25;
  return p;
}

/** Leaning back into a slide, the leading leg out along the turf and one hand trailing. */
export function slide(t: number): Pose {
  const p = neutral();
  const drop = smooth(t / 0.12);
  p.pitch = -1.12 * drop;
  p.lift = -0.08 * drop;
  p.fwd = 0.5 * drop;
  p.hipRX = -0.15 * drop;
  p.kneeR = 0.05;
  p.hipLX = -0.3 * drop;
  p.kneeL = 1.5 * drop;
  p.hipLZ = 0.2;
  p.shLX = 1.2 * drop;
  p.shLZ = 0.5;
  p.shRX = -1.4 * drop;
  p.shRZ = 0.6;
  p.elR = -0.3;
  p.spineX = 0.4 * drop;
  p.neckX = 0.5 * drop;
  return p;
}

/** Scythed down: pitching forward onto the turf with the arms out. */
export function stumble(t: number): Pose {
  const p = neutral();
  const fall = smooth(t / 0.35);
  p.pitch = 1.3 * fall;
  p.lift = -0.05 * fall;
  p.fwd = -0.2 * fall;
  p.shLX = p.shRX = -2.4 * fall;
  p.shLZ = p.shRZ = 0.5;
  p.elL = p.elR = -0.5;
  p.hipLX = 0.3 * fall;
  p.kneeL = 0.6 * fall;
  p.kneeR = 0.2;
  p.neckX = -0.6 * fall;
  return p;
}

/** Back on the feet from the floor, through a crouch. */
export function getUp(t: number, length: number): Pose {
  const p = neutral();
  const up = smooth(t / length);
  p.kneeL = p.kneeR = 1.3 * (1 - up);
  p.hipLX = p.hipRX = -1.1 * (1 - up);
  p.pitch = 0.5 * (1 - up);
  p.lift = -0.32 * (1 - up);
  p.shLX = p.shRX = -0.5 * (1 - up);
  p.shLZ = p.shRZ = 0.3;
  return p;
}

/** Hopping over a sliding boot with the ball. */
export function hurdle(t: number, length: number): Pose {
  const p = run(t * 2.2, 5, true);
  const h = Math.sin(Math.PI * clamp01(t / length));
  p.lift += 0.38 * h;
  p.kneeL += 1.1 * h;
  p.kneeR += 0.9 * h;
  p.hipLX -= 0.7 * h;
  p.hipRX -= 0.4 * h;
  p.shLZ += 0.9 * h;
  p.shRZ += 0.9 * h;
  return p;
}

/** The wind up of a held shot: body coiled, leg cocked. */
export function charging(stride: number, speed: number, charge: number): Pose {
  const p = run(stride, speed, true);
  p.hipRX += 0.5 * charge;
  p.kneeR += 0.7 * charge;
  p.shLZ += 0.5 * charge;
  p.spineY -= 0.25 * charge;
  return p;
}
