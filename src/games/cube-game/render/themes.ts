/**
 * Each level's look. Colours are hex numbers for three.js. Every level
 * is dark with one soft neon edge colour and a second accent, a little
 * muted so they sit calmly on screen, while the spikes and the player
 * still read clearly against them.
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
    skyLow: 0x24457a,
    skyHigh: 0x0a1030,
    sun: 0xa8dcea,
    sunLow: 0x6a78c8,
    sunSize: 9,
    fill: 0x0e1c3a,
    edge: 0x5fc6dc,
    grid: 0x3a82b8,
    accent: 0x8a80d0,
    spike: 0xc6eef5,
    skyline: "towers",
  },
  "sunset-bounce": {
    skyLow: 0xb8604a,
    skyHigh: 0x351440,
    sun: 0xf0cf8a,
    sunLow: 0xd06a8c,
    sunSize: 14,
    fill: 0x2c1234,
    edge: 0xe57aa8,
    grid: 0xc8708a,
    accent: 0xe8b070,
    spike: 0xf5e2ea,
    skyline: "dunes",
  },
  "cloud-hopper": {
    skyLow: 0x4a44a0,
    skyHigh: 0x141036,
    sun: 0xf0dcef,
    sunLow: 0x9280d8,
    sunSize: 7,
    fill: 0x1c1848,
    edge: 0x88dcd4,
    grid: 0x9a8cd8,
    accent: 0xe0a8dc,
    spike: 0xeef8f6,
    skyline: "clouds",
  },
  "circuit-rush": {
    skyLow: 0x184834,
    skyHigh: 0x06120e,
    sun: 0xb4e89a,
    sunLow: 0x3a9a8e,
    sunSize: 8,
    fill: 0x0a1c14,
    edge: 0x5cd896,
    grid: 0x3aa874,
    accent: 0xd8e07a,
    spike: 0xe2f5ea,
    skyline: "circuits",
  },
  "core-meltdown": {
    skyLow: 0x7a2414,
    skyHigh: 0x160608,
    sun: 0xe8784a,
    sunLow: 0xa02a44,
    sunSize: 16,
    fill: 0x220a0a,
    edge: 0xe06050,
    grid: 0xd07a3a,
    accent: 0xe8b84a,
    spike: 0xf5e2d6,
    skyline: "spires",
  },
  // The Demon levels: deeper skies and hotter edges than anything before, so they feel like a step up.
  "neon-abyss": {
    skyLow: 0x3a1060,
    skyHigh: 0x06020f,
    sun: 0xf08ad8,
    sunLow: 0x6a2aa8,
    sunSize: 12,
    fill: 0x140828,
    edge: 0xc868e0,
    grid: 0x8a48d0,
    accent: 0x48d0dc,
    spike: 0xf5e2fa,
    skyline: "circuits",
  },
  "inferno-gate": {
    skyLow: 0x4a0a30,
    skyHigh: 0x0a0208,
    sun: 0xf0606a,
    sunLow: 0x9a1a50,
    sunSize: 18,
    fill: 0x1c0610,
    edge: 0xf05070,
    grid: 0xc02a58,
    accent: 0xf0b040,
    spike: 0xffe4ec,
    skyline: "spires",
  },
};

export function themeFor(id: string): Theme {
  return THEMES[id] ?? THEMES["first-light"]!;
}

/** Portal colours by mode, as in the original: green cube, orange UFO, red ball. */
export const MODE_COLOURS = { cube: 0x4fdc7a, ufo: 0xf0a040, ball: 0xe85468 } as const;
