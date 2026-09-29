import { orbitPose, type OrbitShot } from "@/games/kit/victory/camera/orbit";
import { CEREMONY, CEREMONY_SPOT } from "../../engine/ceremony";
import type { Aim, Vec } from "./shots";

/** The top of the trophy held right up, from the turf. */
export const TROPHY_TOP = 3.1;
/** The crane's reveal runs from the lift until here, then the slow orbit takes over. */
export const CRANE_END = 8.8;
/** The trophy's top sits this far up the screen (-1 bottom to 1 top), under the names across the top third. */
const TOP_AT = 0.2;
/** Once the stats are up the side stands in the left of the picture, clear of the card on the right. */
const SIDE_AT = -0.42;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** A camera `radius` out from the spot at `angle` (round +y from +z, so 0 is square in front) and `height` up. */
function around(angle: number, radius: number, height: number): Vec {
  return { x: CEREMONY_SPOT.x + Math.sin(angle) * radius, y: height, z: CEREMONY_SPOT.z + Math.cos(angle) * radius };
}

/** Where to look from `pos` so the top of the raised trophy sits at `TOP_AT`, leaving the top third to the names. */
function lookUnderNames(pos: Vec, fov: number): Vec {
  const flat = Math.hypot(pos.x - CEREMONY_SPOT.x, pos.z - CEREMONY_SPOT.z);
  const toTop = Math.atan2(TROPHY_TOP - pos.y, flat);
  const pitch = toTop - Math.atan(TOP_AT * Math.tan((fov * Math.PI) / 360));
  return { x: CEREMONY_SPOT.x, y: pos.y + Math.tan(pitch) * flat, z: CEREMONY_SPOT.z };
}

/**
 * Before the lift: low in front of the captain with the trophy at his
 * chest and his team either side, drifting round and pushing in, then
 * sinking and tilting up to follow it as it goes over his head.
 */
function hero(t: number): { pos: Vec; look: Vec; fov: number } {
  const s = smooth(t / CEREMONY.up);
  const lift = smooth((t - CEREMONY.raise) / (CEREMONY.up - CEREMONY.raise));
  const pos = around(0.5 - 0.45 * s, 5.4 - 1.3 * s, 1.55 - 0.7 * lift);
  return { pos, look: { x: CEREMONY_SPOT.x, y: 1.4 + 0.85 * lift, z: CEREMONY_SPOT.z }, fov: 32 };
}

/** The reveal: a cut wide as the trophy goes up, then a crane that rises and swings across the front. */
function crane(u: number): { pos: Vec; look: Vec; fov: number } {
  const s = smooth(u / (CRANE_END - CEREMONY.up));
  const fov = mix(38, 34, s);
  const pos = around(mix(-0.65, 0.5, s), mix(7.6, 11.5, s), mix(0.9, 3.4, s));
  return { pos, look: lookUnderNames(pos, fov), fov };
}

const ORBIT: OrbitShot = {
  centre: { x: CEREMONY_SPOT.x, y: 0, z: CEREMONY_SPOT.z },
  radius: 11.5,
  height: 3.4,
  lookHeight: 1.4,
  startAngle: 0.5,
  speed: 0.09,
  introS: 0,
  pullBack: 1,
  rise: 0,
  bob: 0.25,
  arc: 0.7,
};

/** Then the kit's slow orbit, swinging across the front; once the stats come up the side slides to the left of the picture. */
function orbit(u: number, t: number, aspect: number): { pos: Vec; look: Vec; fov: number } {
  const pose = orbitPose(ORBIT, u);
  const fov = 34;
  const look = lookUnderNames(pose.position, fov);
  const aside = smooth((t - CEREMONY.stats + 0.6) / 1.4);
  if (aside > 0) {
    // Sideways in the picture is across the line of sight; half the screen's width there is tan(fov/2) * aspect * distance.
    const dx = look.x - pose.position.x;
    const dz = look.z - pose.position.z;
    const d = Math.hypot(dx, dz);
    const shift = -SIDE_AT * Math.tan((fov * Math.PI) / 360) * aspect * d * aside;
    look.x += (-dz / d) * shift;
    look.z += (dx / d) * shift;
  }
  return { pos: pose.position, look, fov };
}

/**
 * The presentation's camera `t` seconds after the cut, for a screen
 * `aspect` wide. Every move is set by the clock, so the director follows
 * it exactly rather than easing after it.
 */
export function ceremonyAim(t: number, aspect: number): Aim {
  const place = t < CEREMONY.up ? hero(t) : t < CRANE_END ? crane(t - CEREMONY.up) : orbit(t - CRANE_END, t, aspect);
  return { ...place, rate: 1000, kind: "ceremony" };
}
