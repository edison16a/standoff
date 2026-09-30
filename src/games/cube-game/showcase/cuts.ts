import type { ShowcaseView } from "@/platform/games/game-api";
import type { Cut } from "./timeline";

/**
 * The trailer, eight seconds that loop: the demon levels at full speed.
 * Each moment comes from a perfect run's own events: Inferno Gate's
 * speed arrows, pad and orb in slow motion, Neon Abyss flipping into
 * ball mode, Core Meltdown's UFO portal, Inferno Gate's ball portal in
 * slow motion, the UFO landing back as a cube, and a last wide portal.
 */
export const TRAILER: readonly Cut[] = [
  { level: "inferno-gate", from: 8.1, seconds: 0.6, angle: { height: 5.2, across: 0.36, floor: 1.2, yaw: -14, drop: 2.6 } },
  {
    level: "inferno-gate",
    from: 8.7,
    seconds: 1,
    rate: 0.45,
    angle: { height: 5.2, across: 0.36, floor: 1.2, yaw: -14, drop: 2.6 },
    to: { height: 7.8, across: 0.42, roll: -6 },
  },
  { level: "neon-abyss", from: 10.55, seconds: 1.3, angle: { height: 7.5, across: 0.3, floor: 1.4, yaw: 24, drop: 2 } },
  { level: "core-meltdown", from: 11.6, seconds: 1.1, angle: { height: 5.5, across: 0.34, floor: 1.1, yaw: -20, drop: 3.2, roll: 5 } },
  { level: "inferno-gate", from: 14.9, seconds: 0.3, angle: { height: 6.5, across: 0.35, floor: 1.4, yaw: 16, drop: 1.8 } },
  {
    level: "inferno-gate",
    from: 15.2,
    seconds: 0.9,
    rate: 0.3,
    angle: { height: 6.5, across: 0.35, floor: 1.4, yaw: 16, drop: 1.8 },
    to: { height: 5, yaw: 22 },
  },
  { level: "inferno-gate", from: 15.47, seconds: 0.6, angle: { height: 5, across: 0.35, floor: 1.4, yaw: 22, drop: 1.8 } },
  { level: "neon-abyss", from: 19.3, seconds: 1.3, angle: { height: 6, across: 0.4, floor: 1.3, yaw: -24, drop: 2.4 } },
  {
    level: "inferno-gate",
    from: 33.35,
    seconds: 0.9,
    angle: { height: 6, across: 0.36, floor: 1.4, yaw: 10, drop: 2.2 },
    to: { height: 9, yaw: 4 },
  },
];

/**
 * The stills. The icon is a game cover: the cube big and close, its face
 * to us, leaping Inferno Gate's first spikes against the red sun, from
 * low with a tilt. The poster is Neon Abyss's UFO slipping through its
 * portal back into a cube.
 */
export const STILLS: Record<Exclude<ShowcaseView, "loop">, Cut> = {
  icon: { level: "inferno-gate", from: 3.24, seconds: 1, settle: true, angle: { height: 4.5, across: 0.44, floor: 1.95, yaw: 8, drop: 1, roll: 4 } },
  poster: { level: "neon-abyss", from: 19.75, seconds: 1, angle: { height: 6.5, across: 0.42, floor: 1.4, yaw: -16, drop: 2.2 } },
};
