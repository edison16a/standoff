/**
 * Each level's look. Colours are hex numbers for three.js. Every level
 * is dark with one soft edge colour and a second accent, calm enough to
 * look at for a whole song, while the spikes and the player still read.
 */
export interface Theme {
  /** Sky from the horizon up. */
  skyLow: number;
  skyHigh: number;
  /** The sun or moon disc, from its top colour to its foot. */
  sun: number;
  sunLow: number;
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
    skyLow: 0x2a4a78,
    skyHigh: 0x0a1026,
    sun: 0xbfe6f0,
    sunLow: 0x6f7fc8,
    sunSize: 9,
    fill: 0x0e1a36,
    edge: 0x6cc4dc,
    grid: 0x3f7fa8,
    accent: 0x8a84d0,
    spike: 0xcfeef5,
    skyline: "towers",
  },
  "sunset-bounce": {
    skyLow: 0xc0664e,
    skyHigh: 0x3a1a48,
    sun: 0xf2cf86,
    sunLow: 0xd9607a,
    sunSize: 14,
    fill: 0x2a1230,
    edge: 0xe07aa8,
    grid: 0xc87088,
    accent: 0xe8b070,
    spike: 0xf6e2ea,
    skyline: "dunes",
  },
  "cloud-hopper": {
    skyLow: 0x5a50a8,
    skyHigh: 0x16123a,
    sun: 0xf0d8ec,
    sunLow: 0x9a86d8,
    sunSize: 7,
    fill: 0x1c1848,
    edge: 0x8fe0d6,
    grid: 0x9a8ad0,
    accent: 0xe0a8e0,
    spike: 0xeaf8f6,
    skyline: "clouds",
  },
  "circuit-rush": {
    skyLow: 0x1e5a44,
    skyHigh: 0x06120e,
    sun: 0xc0e89a,
    sunLow: 0x3aa894,
    sunSize: 8,
    fill: 0x0a1c15,
    edge: 0x6ad8a0,
    grid: 0x3fa878,
    accent: 0xd6e07a,
    spike: 0xe0f5e8,
    skyline: "circuits",
  },
  "core-meltdown": {
    skyLow: 0x8a2a1a,
    skyHigh: 0x160608,
    sun: 0xf08a50,
    sunLow: 0xa83048,
    sunSize: 16,
    fill: 0x220a0a,
    edge: 0xe8644e,
    grid: 0xd0783a,
    accent: 0xf0c060,
    spike: 0xf6e0d0,
    skyline: "spires",
  },
};

export function themeFor(id: string): Theme {
  return THEMES[id] ?? THEMES["first-light"]!;
}

/** Portal colours by mode, as in the original: green cube, orange UFO, red ball. */
export const MODE_COLOURS = { cube: 0x5ee08a, ufo: 0xf0a040, ball: 0xe85a6a } as const;
