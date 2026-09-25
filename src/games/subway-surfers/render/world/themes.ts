import * as THREE from "three";
import { ZONE_LENGTH } from "../../engine/tuning";

export type SideKind = "wall" | "buildings" | "platform" | "containers" | "fence" | "neon" | "trees";

/**
 * One look for the yard. The scenery changes every zone, as the pace and
 * the multiplier step up, so a long run travels somewhere new.
 */
export interface Theme {
  name: string;
  skyTop: number;
  skyHorizon: number;
  fog: number;
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  /** The ground beyond the tracks. */
  verge: number;
  wall: string;
  buildings: readonly string[];
  /** What lines the sides, by weight. */
  sides: readonly (readonly [SideKind, number])[];
  /** Share of the zone spent in tunnels. */
  tunnels: number;
}

export const THEMES: readonly Theme[] = [
  {
    name: "Sunny yard",
    skyTop: 0x2f8cff,
    skyHorizon: 0xbfe6ff,
    fog: 0xbfe0f5,
    sun: 0xfff1d6,
    sunIntensity: 2.6,
    hemiSky: 0xcfe9ff,
    hemiGround: 0x8a7a66,
    verge: 0x9a8f7c,
    wall: "#c9c3b8",
    buildings: ["#e8b04a", "#e86a4a", "#6aa6e8", "#f0e2c4"],
    sides: [["wall", 4], ["fence", 2], ["buildings", 2], ["platform", 1.5]],
    tunnels: 0.12,
  },
  {
    name: "Downtown",
    skyTop: 0x4a7fe0,
    skyHorizon: 0xffe0b8,
    fog: 0xf2d8c2,
    sun: 0xffe2b8,
    sunIntensity: 2.4,
    hemiSky: 0xffe6cc,
    hemiGround: 0x7a6a5c,
    verge: 0x8f8478,
    wall: "#d8b89a",
    buildings: ["#d9534f", "#f0ad4e", "#5bc0de", "#9b7fd4", "#e7e2d6"],
    sides: [["buildings", 4], ["platform", 2.5], ["wall", 2]],
    tunnels: 0.2,
  },
  {
    name: "Sunset docks",
    skyTop: 0x5a3fb8,
    skyHorizon: 0xffa25e,
    fog: 0xf7a978,
    sun: 0xffb27a,
    sunIntensity: 2.2,
    hemiSky: 0xffc2a0,
    hemiGround: 0x6a4a5a,
    verge: 0x8d7466,
    wall: "#c7a58f",
    buildings: ["#e0685a", "#f2a65a", "#4a8fb8"],
    sides: [["containers", 4], ["trees", 2], ["wall", 2], ["fence", 1]],
    tunnels: 0.1,
  },
  {
    name: "Neon night",
    skyTop: 0x150e3d,
    skyHorizon: 0x7b3fb8,
    fog: 0x4a2a78,
    sun: 0xc8b8ff,
    sunIntensity: 1.8,
    hemiSky: 0x9c86ff,
    hemiGround: 0x3a2a55,
    verge: 0x4a4458,
    wall: "#7d7590",
    buildings: ["#3b2f6b", "#523a8a", "#2d3f6b"],
    sides: [["neon", 4], ["buildings", 2], ["platform", 1.5], ["wall", 1.5]],
    tunnels: 0.25,
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
