import type { ThemeId } from "../tracks/types";

/**
 * Each map's colours and light in one place: the road, the kerb stripes,
 * the barriers, the sky and the fog. The scenery files add the props;
 * this keeps the shared road pieces looking right on every map.
 */
export interface Theme {
  road: string;
  roadSpeckle: string;
  /** Painted lines: edges, centre dashes and arrows. */
  line: string;
  centre: string;
  kerb: readonly string[];
  shoulder: string;
  wall: string;
  wallTop: string;
  /** Chevron boards on the outside of bends. */
  sign: string;
  signInk: string;
  skyTop: string;
  skyBottom: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  sun: string;
  sunIntensity: number;
  ambientSky: string;
  ambientGround: string;
  ambient: number;
  pad: string;
  /** The track floats (space) and needs a thick edge underneath. */
  floating: boolean;
}

export const THEMES: Record<ThemeId, Theme> = {
  beach: {
    road: "#5a4679",
    roadSpeckle: "#6f5a92",
    line: "#ffffff",
    centre: "#f4f1ff",
    kerb: ["#ff5470", "#ff9f40", "#ffe14d", "#57d977", "#48a8ff", "#a66bff"],
    shoulder: "#f2dfb0",
    wall: "#ffffff",
    wallTop: "#ff5470",
    sign: "#ff4d6d",
    signInk: "#ffffff",
    skyTop: "#3aa3f5",
    skyBottom: "#c9ecff",
    fog: "#cfefff",
    fogNear: 140,
    fogFar: 520,
    sun: "#fff4dc",
    sunIntensity: 2.6,
    ambientSky: "#bfe6ff",
    ambientGround: "#f2dfb0",
    ambient: 1.35,
    pad: "#ffb020",
    floating: false,
  },
  space: {
    road: "#1d1a44",
    roadSpeckle: "#2a2660",
    line: "#6ff4ff",
    centre: "#ff7df2",
    kerb: ["#ffffff", "#3fe8ff"],
    shoulder: "#2b2a5e",
    wall: "#3a3470",
    wallTop: "#3fe8ff",
    sign: "#ff4fd8",
    signInk: "#ffffff",
    skyTop: "#05031a",
    skyBottom: "#2a0f55",
    fog: "#1a0c3a",
    fogNear: 180,
    fogFar: 700,
    sun: "#e6e0ff",
    sunIntensity: 2.2,
    ambientSky: "#8f7dff",
    ambientGround: "#2a1650",
    ambient: 1.25,
    pad: "#3fe8ff",
    floating: true,
  },
  city: {
    road: "#2a2b36",
    roadSpeckle: "#373846",
    line: "#f5f5ff",
    centre: "#ffd23f",
    kerb: ["#ff3fb4", "#1fe0ff"],
    shoulder: "#3b3c4a",
    wall: "#5a5c6e",
    wallTop: "#ff3fb4",
    sign: "#1fe0ff",
    signInk: "#101022",
    skyTop: "#070718",
    skyBottom: "#3a1650",
    fog: "#24123a",
    fogNear: 90,
    fogFar: 420,
    sun: "#b8b0ff",
    sunIntensity: 1.3,
    ambientSky: "#6c5cff",
    ambientGround: "#2a1a33",
    ambient: 1.1,
    pad: "#ff3fb4",
    floating: false,
  },
  volcano: {
    road: "#3a2f33",
    roadSpeckle: "#4a3c40",
    line: "#ffb347",
    centre: "#ffe0a8",
    kerb: ["#ff3b1f", "#ffd23f"],
    shoulder: "#4c3a33",
    wall: "#5b4a44",
    wallTop: "#ff6a1f",
    sign: "#ffb020",
    signInk: "#3a1a0a",
    skyTop: "#2b0d14",
    skyBottom: "#ff7a3a",
    fog: "#8a3a2a",
    fogNear: 110,
    fogFar: 460,
    sun: "#ffc28a",
    sunIntensity: 2.1,
    ambientSky: "#ff9a6a",
    ambientGround: "#3a1a14",
    ambient: 1.15,
    pad: "#ff7a1f",
    floating: false,
  },
};
