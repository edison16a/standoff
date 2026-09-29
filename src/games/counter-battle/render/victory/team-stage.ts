import type { OrbitShot } from "@/games/kit/victory";
import type { GunId } from "../../engine/guns";
import type { AnimInput } from "../anim/anim-input";

/** Where one winner stands on the stage and which way they face (0 faces the camera's opening, +z). */
export interface StandSpot {
  x: number;
  z: number;
  look: number;
  /** The one who lifts the trophy: the team's top scorer. */
  trophy: boolean;
}

/** One splat of paint on the stage floor, laid out by `floorSplats`. */
export interface FloorSplat {
  x: number;
  z: number;
  size: number;
  pick: number;
  spin: number;
  /** Paint from the losing side, or the winners' own. */
  losers: boolean;
}

/** Winners stand this far apart, shoulder to shoulder. */
const SPACING = 1.3;
/** Each turns in toward the middle by this much for every metre out. */
const TURN_IN = 0.28;
/** The stage the team stands on. */
export const STAGE = { radius: 1.9, height: 0.32 };
/** How far left of the middle the team stands, as a share of the screen's width, leaving the bottom right corner to the results. */
export const SHIFT = 0.12;
/** The cup's size, and how far its base sits over the lifting wrist, on top of the fist. */
export const CUP = { scale: 1.25, aboveWrist: 0.07 };

/**
 * The winners side by side across the middle, top scorer first. That one
 * lifts the trophy in the left hand, which is on the camera's right, so
 * they stand on the camera's left and the cup rises near the middle.
 */
export function standSpots(count: number): StandSpot[] {
  return Array.from({ length: count }, (_, i) => {
    const x = (i - (count - 1) / 2) * SPACING;
    return { x, z: Math.abs(x) * -0.12, look: -x * TURN_IN, trophy: i === 0 };
  });
}

/**
 * The circling shot round the team: back far enough that the cup held
 * overhead stays under the names across the top and everyone's boots
 * stay in the picture, swinging a little either way.
 */
export function teamShot(count: number): Partial<OrbitShot> {
  // One winner's name is bigger, so their subtitle sits lower and the camera looks higher to bring the cup under it.
  const solo = count === 1;
  return { centre: { x: 0, y: STAGE.height, z: 0 }, radius: solo ? 8.3 : 7.5, height: 1.55, lookHeight: solo ? 2.3 : 2.05, startAngle: 0, speed: 0.12, arc: 0.35, introS: 2.4, pullBack: 1.45, rise: 1.6, bob: 0.12 };
}

/** A seeded 0 to 1 random source, so the paint lands the same way every time. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * Paint all over the floor round the stage, as if the last round was
 * fought right here: bigger splats close in, most in the losers' colour.
 */
export function floorSplats(count: number, seed = 5): FloorSplat[] {
  const random = seeded(seed);
  return Array.from({ length: count }, () => {
    const angle = random() * Math.PI * 2;
    const out = STAGE.radius + 0.2 + random() ** 1.4 * 4.2;
    return {
      x: Math.sin(angle) * out,
      z: Math.cos(angle) * out,
      size: 0.5 + (1 - (out - STAGE.radius) / 4.4) * 0.8 * (0.6 + random() * 0.6),
      pick: random(),
      spin: random(),
      losers: random() < 0.7,
    };
  });
}

/** A winner standing still and celebrating, `t` seconds in, as the animator reads a fighter. */
export function celebrating(gun: GunId, spot: StandSpot, t: number): AnimInput {
  return {
    now: t,
    x: spot.x,
    z: spot.z,
    look: spot.look,
    speed: 0,
    dir: { x: 0, z: 1 },
    crouch: 0,
    lean: 0,
    aimYaw: 0,
    aimPitch: 0,
    raise: 0.2,
    gun,
    reloading: false,
    reloadP: 0,
    shellQ: 0,
    shotAt: -100,
    hitAt: -100,
    alive: true,
    diedAt: 0,
    wonAt: 0,
  };
}
