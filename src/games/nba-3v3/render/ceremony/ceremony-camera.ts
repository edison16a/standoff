import { orbitPose, type OrbitShot } from "@/games/kit/victory";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface CameraPlace {
  pos: Point;
  look: Point;
  /** Vertical field of view in degrees. */
  fov: number;
}

/** The top of the trophy held right up, from the floor. */
export const TROPHY_TOP = 3.4;
/** The crane's reveal runs from the lift until here, then the slow orbit takes over. */
export const CRANE_END = 8.8;
/** The trophy's top sits this far up the screen (-1 bottom to 1 top), under the names across the top third. */
const TOP_AT = 0.2;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** A camera `radius` out from the spot at `angle` (0 square in front, toward +z) and `height` up. */
function around(angle: number, radius: number, height: number): Point {
  return { x: CEREMONY_SPOT.x + Math.sin(angle) * radius, y: height, z: CEREMONY_SPOT.z + Math.cos(angle) * radius };
}

/** Where to look from `pos` so the raised trophy's top sits at `TOP_AT`, leaving the top third for the names. */
export function lookUnderNames(pos: Point, fov: number): Point {
  const flat = Math.hypot(pos.x - CEREMONY_SPOT.x, pos.z - CEREMONY_SPOT.z);
  const toTop = Math.atan2(TROPHY_TOP - pos.y, flat);
  const pitch = toTop - Math.atan(TOP_AT * Math.tan((fov * Math.PI) / 360));
  return { x: CEREMONY_SPOT.x, y: pos.y + Math.tan(pitch) * flat, z: CEREMONY_SPOT.z };
}

/**
 * Before the lift: a close shot drifting round the captain at chest
 * height with the trophy in his arms, pushing in, then sinking low and
 * tilting up to follow the trophy as it goes over his head.
 */
function hero(t: number): CameraPlace {
  const s = smooth(t / CEREMONY.up);
  const lift = smooth((t - CEREMONY.raise) / (CEREMONY.up - CEREMONY.raise));
  const pos = around(-0.5 + 0.55 * s, 5.4 - 1.3 * s, 1.6 - 0.8 * lift);
  return { pos, look: { x: CEREMONY_SPOT.x, y: 1.45 + 1.0 * lift, z: CEREMONY_SPOT.z }, fov: 32 };
}

/** The reveal: a cut wide as it goes up, then a crane rising and swinging across the front. */
function crane(u: number): CameraPlace {
  const s = smooth(u / (CRANE_END - CEREMONY.up));
  const fov = mix(40, 34, s);
  const pos = around(mix(0.65, -0.45, s), mix(6.4, 10, s), mix(0.7, 3.4, s));
  return { pos, look: lookUnderNames(pos, fov), fov };
}

const ORBIT: OrbitShot = {
  centre: { x: CEREMONY_SPOT.x, y: 0, z: CEREMONY_SPOT.z },
  radius: 10,
  height: 3.4,
  lookHeight: 1.4,
  startAngle: -0.45,
  speed: 0.08,
  introS: 0,
  pullBack: 1,
  rise: 0,
  bob: 0.2,
  arc: 0.7,
};

/** Then the kit's slow orbit, swinging back and forth across the front of the team. */
function orbit(u: number): CameraPlace {
  const pose = orbitPose(ORBIT, u);
  const fov = 34;
  return { pos: pose.position, look: lookUnderNames(pose.position, fov), fov };
}

/** The ceremony's camera `t` seconds after the cut. */
export function ceremonyCamera(t: number): CameraPlace {
  if (t < CEREMONY.up) return hero(t);
  if (t < CRANE_END) return crane(t - CEREMONY.up);
  return orbit(t - CRANE_END);
}
