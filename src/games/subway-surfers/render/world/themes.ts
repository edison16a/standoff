import * as THREE from "three";
import { ZONE_LENGTH } from "../../engine/tuning";

export type SideKind = "wall" | "woodFence" | "metalFence" | "platform" | "buildings" | "trees" | "containers";

/**
 * One stretch of the sunny rail yard. Every zone is bright daytime; what
 * lines the tracks changes every zone, as the pace and the multiplier
 * step up, so a long run travels somewhere new.
 */
export interface Theme {
  name: string;
  skyTop: number;
  skyHorizon: number;
  /** The haze far down the track, close to the horizon so the yard fades into the sky. */
  fog: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  /** The ground past the gravel: dusty earth, or grass by the parks. */
  ground: number;
  /** Concrete for the walls the graffiti goes on. */
  wall: string;
  /** Facades of the blocks of flats and shops. */
  buildings: readonly string[];
  /** Bright paint for awnings, canopies, pillars and benches. */
  accent: readonly [number, number, number];
  /** What lines the sides, by weight. */
  sides: readonly (readonly [SideKind, number])[];
  /** Share of the zone spent in tunnels. */
  tunnels: number;
}

export const THEMES: readonly Theme[] = [
  {
    name: "Downtown yard",
    skyTop: 0x2d8ff0,
    skyHorizon: 0xc4ebff,
    fog: 0xcdeeff,
    sun: 0xfff6e6,
    sunIntensity: 1.7,
    hemiSky: 0xe8f6ff,
    hemiGround: 0xd8c4a0,
    ground: 0xb89f7c,
    wall: "#cfc7b8",
    buildings: ["#d8704c", "#e9c27c", "#8fb4d6", "#e79a7c"],
    accent: [0xe8312a, 0x1f6fd6, 0xffc21a],
    sides: [["wall", 3], ["woodFence", 2], ["buildings", 2], ["platform", 1.5], ["trees", 1]],
    tunnels: 0.14,
  },
  {
    name: "Harbour sidings",
    skyTop: 0x2596e6,
    skyHorizon: 0xc8f2ff,
    fog: 0xd2f3ff,
    sun: 0xfff8ec,
    sunIntensity: 1.7,
    hemiSky: 0xe4f8ff,
    hemiGround: 0xc8bca4,
    ground: 0xaa9b84,
    wall: "#c4c8c8",
    buildings: ["#7fb0c8", "#e6d4a8", "#c9785a", "#9cc49a"],
    accent: [0xff8a1f, 0x1f8fb0, 0xe8312a],
    sides: [["containers", 3], ["metalFence", 2], ["wall", 2], ["trees", 1]],
    tunnels: 0.12,
  },
  {
    name: "Park lane",
    skyTop: 0x3399f0,
    skyHorizon: 0xd2f0ff,
    fog: 0xd4f0ff,
    sun: 0xfff4dc,
    sunIntensity: 1.7,
    hemiSky: 0xecf8ff,
    hemiGround: 0xa8c47c,
    ground: 0x7fbf4c,
    wall: "#d2cabb",
    buildings: ["#e0a36c", "#f0d78c", "#a7c7e0", "#d98878"],
    accent: [0x3fb54a, 0xffc21a, 0x1f6fd6],
    sides: [["trees", 3], ["woodFence", 2], ["platform", 1.5], ["buildings", 1.5]],
    tunnels: 0.2,
  },
  {
    name: "Uptown heights",
    skyTop: 0x3a88e6,
    skyHorizon: 0xffe8c8,
    fog: 0xf6ead8,
    sun: 0xffecc8,
    sunIntensity: 1.75,
    hemiSky: 0xfff2e0,
    hemiGround: 0xd8b890,
    ground: 0xbfa27c,
    wall: "#d6cab4",
    buildings: ["#c86a4c", "#e8b86c", "#8c9fc8", "#f0c8a0"],
    accent: [0x8a4be8, 0xff5a5f, 0xffc21a],
    sides: [["buildings", 3], ["platform", 2], ["wall", 2], ["metalFence", 1]],
    tunnels: 0.16,
  },
];

export function themeIndexAt(distance: number): number {
  return Math.max(0, Math.floor(distance / ZONE_LENGTH)) % THEMES.length;
}

export function themeAt(distance: number): Theme {
  return THEMES[themeIndexAt(distance)]!;
}

/** Where the light fades from the old theme to the new: the first stretch of each zone. */
const FADE = 80;

/** The light at a distance: the zone's own, blended with the last near a change. */
export function lightAt(distance: number, out: Light): Light {
  const into = distance - Math.floor(distance / ZONE_LENGTH) * ZONE_LENGTH;
  const now = themeAt(distance);
  const before = distance >= ZONE_LENGTH ? themeAt(distance - ZONE_LENGTH) : now;
  const t = into < FADE ? into / FADE : 1;
  const mix = (a: number, b: number, target: THREE.Color) => target.setHex(a).lerp(scratch.setHex(b), t);
  mix(before.skyTop, now.skyTop, out.skyTop);
  mix(before.skyHorizon, now.skyHorizon, out.skyHorizon);
  mix(before.fog, now.fog, out.fog);
  mix(before.sun, now.sun, out.sun);
  mix(before.hemiSky, now.hemiSky, out.hemiSky);
  mix(before.hemiGround, now.hemiGround, out.hemiGround);
  out.sunIntensity = before.sunIntensity + (now.sunIntensity - before.sunIntensity) * t;
  return out;
}

const scratch = new THREE.Color();

export interface Light {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
}

export function newLight(): Light {
  const c = () => new THREE.Color();
  return { skyTop: c(), skyHorizon: c(), fog: c(), sun: c(), sunIntensity: 1, hemiSky: c(), hemiGround: c() };
}
