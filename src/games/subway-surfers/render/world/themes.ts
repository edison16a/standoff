import * as THREE from "three";
import { ZONE_LENGTH } from "../../engine/tuning";

export type SideKind = "wall" | "buildings" | "platform" | "containers" | "fence" | "neon" | "holo";

/**
 * One look for the neon city. Every zone is night, lit by signs, and the
 * palette changes every zone, as the pace and the multiplier step up, so
 * a long run travels somewhere new.
 */
export interface Theme {
  name: string;
  skyTop: number;
  skyHorizon: number;
  /** The haze, close to the horizon so the city fades into its glow. */
  fog: number;
  /** Moonlight, the one direct light. */
  sun: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  /** The wet ground beyond the tracks. */
  verge: number;
  wall: string;
  /** Facades, dark so their lit windows and signs stand out. */
  buildings: readonly string[];
  /** The zone's neon: the rails and trims first, then the signs and holograms. */
  neon: readonly [number, number, number];
  /** What lines the sides, by weight. */
  sides: readonly (readonly [SideKind, number])[];
  /** Share of the zone spent in tunnels. */
  tunnels: number;
}

export const THEMES: readonly Theme[] = [
  {
    name: "Neon downtown",
    skyTop: 0x05041a,
    skyHorizon: 0x6a1f86,
    fog: 0x341a5c,
    sun: 0xc4b6ff,
    sunIntensity: 1.8,
    hemiSky: 0xb3a6ff,
    hemiGround: 0x3a2050,
    verge: 0x17142a,
    wall: "#2b2548",
    buildings: ["#1d1838", "#261d4a", "#17223f"],
    neon: [0x21f3ff, 0xff2bd6, 0xffd21f],
    sides: [["neon", 3], ["buildings", 2], ["holo", 2], ["wall", 2], ["platform", 1.5]],
    tunnels: 0.15,
  },
  {
    name: "Cyan harbour",
    skyTop: 0x020b1c,
    skyHorizon: 0x11587a,
    fog: 0x123a55,
    sun: 0xa8ecff,
    sunIntensity: 1.8,
    hemiSky: 0x9fdcff,
    hemiGround: 0x142a36,
    verge: 0x101c26,
    wall: "#1f3342",
    buildings: ["#12263a", "#18304a", "#1d2540"],
    neon: [0xff8a1f, 0x21f3ff, 0xff2bd6],
    sides: [["containers", 3], ["holo", 2], ["fence", 2], ["neon", 2]],
    tunnels: 0.12,
  },
  {
    name: "Acid arcade",
    skyTop: 0x08021c,
    skyHorizon: 0x44157a,
    fog: 0x2a1450,
    sun: 0xd6ffc0,
    sunIntensity: 1.7,
    hemiSky: 0xc6b8ff,
    hemiGround: 0x2a1a3e,
    verge: 0x151226,
    wall: "#2d2150",
    buildings: ["#1f1640", "#2a1a50", "#162a3a"],
    neon: [0x9dff2b, 0xa24bff, 0x21f3ff],
    sides: [["neon", 4], ["holo", 2], ["platform", 2], ["wall", 1.5]],
    tunnels: 0.22,
  },
  {
    name: "Ultraviolet heights",
    skyTop: 0x0c0218,
    skyHorizon: 0x8a1f5a,
    fog: 0x44173f,
    sun: 0xffc0e0,
    sunIntensity: 1.8,
    hemiSky: 0xffb8e8,
    hemiGround: 0x3a1a34,
    verge: 0x1c1224,
    wall: "#3a2040",
    buildings: ["#2a1436", "#1e1a44", "#34183a"],
    neon: [0xff2bd6, 0xff5a1f, 0x8a5bff],
    sides: [["buildings", 3], ["holo", 2], ["neon", 2], ["fence", 1.5], ["wall", 1.5]],
    tunnels: 0.18,
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
  mix(before.neon[1], now.neon[1], out.neon);
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
  /** The zone's sign colour, which tints the city glow along the horizon. */
  neon: THREE.Color;
}

export function newLight(): Light {
  const c = () => new THREE.Color();
  return { skyTop: c(), skyHorizon: c(), fog: c(), sun: c(), sunIntensity: 1, hemiSky: c(), hemiGround: c(), neon: c() };
}
