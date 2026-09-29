import { orbitPose, type OrbitShot } from "@/games/kit/victory/camera/orbit";
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

/** The top of the cup held right up, from the turf. */
export const CUP_TOP = 2.8;
/** The crane's reveal runs from the lift until here, then the slow orbit takes over. */
export const CRANE_END = 8.6;
/** The cup's top sits this far up the screen (-1 bottom to 1 top), under the names across the top third. */
const TOP_AT = 0.22;
/** Once the stats are up the side stands in the left of the picture, clear of the card on the right. */
const SIDE_AT = -0.36;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** A camera `radius` out from the spot at `angle` (round +y from +z, so 0 is square in front) and `height` up. */
function around(angle: number, radius: number, height: number): Point {
  return { x: CEREMONY_SPOT.x + Math.sin(angle) * radius, y: height, z: CEREMONY_SPOT.z + Math.cos(angle) * radius };
}

/**
 * Where to look from `pos` so the top of the raised cup sits at `TOP_AT`
 * on the screen: the frame is aimed a little above the side's middle,
 * which leaves the top third to the names.
 */
function lookUnderNames(pos: Point, fov: number): Point {
  const flat = Math.hypot(pos.x - CEREMONY_SPOT.x, pos.z - CEREMONY_SPOT.z);
  const toTop = Math.atan2(CUP_TOP - pos.y, flat);
  const pitch = toTop - Math.atan(TOP_AT * Math.tan((fov * Math.PI) / 360));
  return { x: CEREMONY_SPOT.x, y: pos.y + Math.tan(pitch) * flat, z: CEREMONY_SPOT.z };
}

/**
 * Before the lift: low and close on the captain with the cup at his
 * chest, drifting round in front of him, then sinking and tilting up to
 * follow the cup as it goes over his head.
 */
function hero(t: number): CameraPlace {
  const s = smooth(t / CEREMONY.up);
  const lift = smooth((t - CEREMONY.raise) / (CEREMONY.up - CEREMONY.raise));
  const pos = around(0.5 - 0.42 * s, 3.4 - 0.7 * s, 1.2 - 0.5 * lift);
  return { pos, look: { x: CEREMONY_SPOT.x, y: 1.25 + 0.95 * lift, z: CEREMONY_SPOT.z }, fov: 30 };
}

/** The reveal: a cut wide as the cup goes up, then a crane that rises and swings across the front. */
function crane(u: number): CameraPlace {
  const s = smooth(u / (CRANE_END - CEREMONY.up));
  const fov = mix(36, 32, s);
  const pos = around(mix(-0.6, 0.5, s), mix(7.2, 10.5, s), mix(0.8, 3.2, s));
  return { pos, look: lookUnderNames(pos, fov), fov };
}

const ORBIT: OrbitShot = {
  centre: { x: CEREMONY_SPOT.x, y: 0, z: CEREMONY_SPOT.z },
  radius: 10.5,
  height: 3.2,
  lookHeight: 1.3,
  startAngle: 0.5,
  speed: 0.09,
  introS: 0,
  pullBack: 1,
  rise: 0,
  bob: 0.25,
  arc: 0.75,
};

/**
 * Then the kit's slow orbit, swinging back and forth across the front.
 * Once the stats come up the aim slides right, so the side stands in
 * the left of the picture.
 */
function orbit(u: number, t: number, aspect: number): CameraPlace {
  const pose = orbitPose(ORBIT, u);
  const fov = 32;
  const look = lookUnderNames(pose.position, fov);
  const aside = smooth((t - CEREMONY.stats + 0.6) / 1.4);
  if (aside > 0) {
    // Sideways in the picture is across the line of sight; half the screen's width at the side's distance is tan(fov/2) * aspect * distance.
    const dx = look.x - pose.position.x;
    const dz = look.z - pose.position.z;
    const d = Math.hypot(dx, dz);
    const half = Math.tan((fov * Math.PI) / 360) * aspect * d;
    const shift = -SIDE_AT * half * aside;
    look.x += (-dz / d) * shift;
    look.z += (dx / d) * shift;
  }
  return { pos: pose.position, look, fov };
}

/** The ceremony's camera `t` seconds after the cut, for a screen `aspect` wide. */
export function ceremonyCamera(t: number, aspect: number): CameraPlace {
  if (t < CEREMONY.up) return hero(t);
  if (t < CRANE_END) return crane(t - CEREMONY.up);
  return orbit(t - CRANE_END, t, aspect);
}
