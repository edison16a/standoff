import type { V3 } from "./pose";

/** Metres per second squared. */
export const GRAVITY = 9.81;

/** How a dropped magazine leaves the gun: its push, its spin, and which way is down. */
export interface Fall {
  /** Starting speed in metres per second. */
  velocity: V3;
  /** Spin in radians per second about each axis. */
  spin: V3;
  /** Unit vector pointing down, in the frame the magazine falls in. */
  down: V3;
}

/**
 * Where a dropped magazine is `t` seconds after it was let go, and how
 * far it has turned. Air drag is nothing over the half second it is on
 * screen, so it is a plain throw under gravity, tumbling at a steady rate.
 */
export function fallAt(fall: Fall, t: number): { offset: V3; turn: V3 } {
  const g = 0.5 * GRAVITY * t * t;
  const offset: V3 = [
    fall.velocity[0] * t + fall.down[0] * g,
    fall.velocity[1] * t + fall.down[1] * g,
    fall.velocity[2] * t + fall.down[2] * g,
  ];
  const turn: V3 = [fall.spin[0] * t, fall.spin[1] * t, fall.spin[2] * t];
  return { offset, turn };
}

/**
 * A believable drop for a magazine freed from the well: already moving
 * down as it slid out, nudged away from the gun, and turning end over end
 * with a little wobble. `random` gives each drop its own tumble.
 */
export function magazineFall(down: V3, outward: V3, random: () => number): Fall {
  const speed = 0.5 + random() * 0.3;
  const push = 0.12 + random() * 0.1;
  return {
    velocity: [down[0] * speed + outward[0] * push, down[1] * speed + outward[1] * push, down[2] * speed + outward[2] * push],
    spin: [(random() < 0.5 ? -1 : 1) * (5 + random() * 4), (random() - 0.5) * 3, (random() - 0.5) * 6],
    down,
  };
}
