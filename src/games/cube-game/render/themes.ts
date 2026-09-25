/**
 * Each level's look. Colours are hex numbers for three.js. Every level
 * is dark with one strong neon edge colour and a second accent, so the
 * spikes and the player always read against it.
 */
export interface Theme {
  /** Sky from the horizon up. */
  skyLow: number;
  skyHigh: number;
  /** The sun or moon disc, and its glow. */
  sun: number;
  sunSize: number;
  /** Block bodies, and their glowing edges. */
  fill: number;
  edge: number;
  /** The floor grid's lines. */
  grid: number;
  /** The second colour, for the distant shapes and the dust. */
  accent: number;
  /** Spike edges. */
  spike: number;
  /** Name of the backdrop's skyline. */
  skyline: "towers" | "dunes" | "clouds" | "circuits" | "spires";
}

export const THEMES: Record<string, Theme> = {
  "first-light": {
    skyLow: 0x1b4e9b,
    skyHigh: 0x060b2e,
    sun: 0x7ce8ff,
    sunSize: 9,
    fill: 0x08183f,
    edge: 0x3ee6ff,
    grid: 0x2aa8ff,
    accent: 0x7a6bff,
    spike: 0x9ff4ff,
    skyline: "towers",
  },
  "sunset-bounce": {
    skyLow: 0xff7a45,
    skyHigh: 0x3a0c52,
    sun: 0xffd166,
    sunSize: 14,
    fill: 0x2a0a36,
    edge: 0xff4fb3,
    grid: 0xff6a8a,
    accent: 0xffb347,
    spike: 0xffe0f0,
    skyline: "dunes",
  },
  "cloud-hopper": {
    skyLow: 0x6a5cff,
    skyHigh: 0x120a3a,
    sun: 0xe6f7ff,
    sunSize: 7,
    fill: 0x1a1250,
    edge: 0x7dfff0,
    grid: 0xa98bff,
    accent: 0xff9ef5,
    spike: 0xe8fffd,
    skyline: "clouds",
  },
  "circuit-rush": {
    skyLow: 0x0b4d2e,
    skyHigh: 0x020d0a,
    sun: 0x9dff6a,
    sunSize: 8,
    fill: 0x03170f,
    edge: 0x35ff8f,
    grid: 0x1fd67a,
    accent: 0xe8ff47,
    spike: 0xd9ffe9,
    skyline: "circuits",
  },
  "core-meltdown": {
    skyLow: 0x8a1000,
    skyHigh: 0x120003,
    sun: 0xff5a1f,
    sunSize: 16,
    fill: 0x1e0404,
    edge: 0xff3b2f,
    grid: 0xff6a00,
    accent: 0xffc400,
    spike: 0xffe2cc,
    skyline: "spires",
  },
};

export function themeFor(id: string): Theme {
  return THEMES[id] ?? THEMES["first-light"]!;
}

/** Portal colours by mode, as in the original: green cube, orange UFO, red ball. */
export const MODE_COLOURS = { cube: 0x3dff6e, ufo: 0xffa21f, ball: 0xff3d5a } as const;
