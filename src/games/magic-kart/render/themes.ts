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
  /** Every other barrier section, for a striped barrier. A darker shade of the wall when left out. */
  wallAlt?: string;
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
  /** How strongly shiny things reflect the studio light. More at night, where there is less sun. */
  reflections: number;
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
    wallAlt: "#ffc2d1",
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
    reflections: 0.35,
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
    reflections: 0.7,
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
    sun: "#c9c2ff",
    sunIntensity: 1.8,
    ambientSky: "#8a7dff",
    ambientGround: "#3a2a46",
    ambient: 1.5,
    pad: "#ff3fb4",
    floating: false,
    reflections: 0.8,
  },
  volcano: {
    // Basalt tarmac a shade lighter than the rock around it, with bright kerbs and glowing edges.
    road: "#4d4450",
    roadSpeckle: "#62586a",
    line: "#ffc46b",
    centre: "#fff0d0",
    kerb: ["#ff3b1f", "#ffe14d"],
    shoulder: "#9a826f",
    wall: "#6e5d57",
    wallTop: "#ff7a1f",
    sign: "#ffb020",
    signInk: "#3a1a0a",
    skyTop: "#3a1020",
    skyBottom: "#ff8a45",
    fog: "#9a4632",
    fogNear: 120,
    fogFar: 480,
    sun: "#ffd2a0",
    sunIntensity: 2.6,
    ambientSky: "#ffb08a",
    ambientGround: "#5a2a1e",
    ambient: 1.5,
    pad: "#ff7a1f",
    floating: false,
    reflections: 0.5,
  },
};
