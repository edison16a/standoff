/**
 * The arena in light and dark. Light is a hot afternoon in an open air
 * arena of warm sandstone under a blue sky. Dark is the night final: a
 * sky full of stars, the stands in shadow, fire in the braziers and a
 * hard white light on the duelling dais.
 */
export interface ArenaTheme {
  dark: boolean;
  /** Sky: overhead, at the horizon, and the haze toward it. */
  zenith: number;
  horizon: number;
  fog: { color: number; density: number };
  hemisphere: { sky: number; ground: number; intensity: number };
  /** The sun by day, the moon by night: casts the shadows when there is no key spot. */
  sun: { color: number; intensity: number };
  /** A spotlight straight down on the dais, the night's main light. */
  key: { color: number; intensity: number };
  rim: { color: number; intensity: number };
  /** How bright the fires burn and how far their light reaches. */
  fire: number;
  stars: boolean;
  reflections: number;
  exposure: number;
  stone: string;
  stoneDark: string;
  sand: string;
  dais: string;
  /** The glowing line down the middle of the dais. */
  line: number;
  seats: number;
  crowdLight: number;
}

export const DAY: ArenaTheme = {
  dark: false,
  zenith: 0x3f86d9,
  horizon: 0xcfe4f5,
  fog: { color: 0xd9e6ef, density: 0.008 },
  hemisphere: { sky: 0xe3f0ff, ground: 0xb8905e, intensity: 1.25 },
  sun: { color: 0xfff1d8, intensity: 3.1 },
  key: { color: 0xfff4e0, intensity: 0 },
  rim: { color: 0xcfe0ff, intensity: 0.9 },
  fire: 0.5,
  stars: false,
  reflections: 0.8,
  exposure: 1,
  stone: "#d8bf94",
  stoneDark: "#a8875c",
  sand: "#d9b47a",
  dais: "#c9b08a",
  line: 0xffc83d,
  seats: 0x8a6a48,
  crowdLight: 0.85,
};

export const NIGHT: ArenaTheme = {
  dark: true,
  zenith: 0x05071a,
  horizon: 0x1b2248,
  fog: { color: 0x0b1024, density: 0.014 },
  hemisphere: { sky: 0x4a5a9a, ground: 0x2a1a10, intensity: 0.28 },
  sun: { color: 0xaec4ff, intensity: 0.4 },
  key: { color: 0xfff0dc, intensity: 130 },
  rim: { color: 0x7fa6ff, intensity: 1.4 },
  fire: 1.2,
  stars: true,
  reflections: 0.9,
  exposure: 1.05,
  stone: "#7a6c5c",
  stoneDark: "#51453a",
  sand: "#8a6e4c",
  dais: "#6a625a",
  line: 0xffc83d,
  seats: 0x3a2e28,
  crowdLight: 0.5,
};

export function arenaTheme(dark: boolean): ArenaTheme {
  return dark ? NIGHT : DAY;
}
