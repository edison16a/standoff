/**
 * The hall in light and dark. Light is a sunny afternoon competition in a
 * sports hall with tall windows. Dark is the evening final: the stands in
 * shadow, spotlights on the strip, the lamps and boards glowing.
 */
export interface HallTheme {
  dark: boolean;
  background: number;
  fog: { color: number; density: number };
  sky: number;
  ground: number;
  hemisphere: number;
  /** The follow spot over the fencers, which also casts their shadows. */
  key: { color: number; intensity: number };
  /** Cool lights from behind that outline the fencers against the hall. */
  rim: { color: number; intensity: number };
  /** Pools of light down the strip, and how visible their beams are. */
  spots: { color: number; intensity: number; beam: number };
  /** Daylight through the windows. Zero in the evening. */
  sun: number;
  reflections: number;
  exposure: number;
  wall: number;
  wallTrim: number;
  floor: number;
  piste: number;
  podium: number;
  seats: number;
  /** Tall windows glow in the day, the ribbon boards glow at night. */
  windows: number;
  boardGlow: number;
  crowdLight: number;
}

export const LIGHT_HALL: HallTheme = {
  dark: false,
  background: 0xe9dcc6,
  fog: { color: 0xe6d8c2, density: 0.028 },
  sky: 0xfff4e2,
  ground: 0xb58a5a,
  hemisphere: 1.35,
  key: { color: 0xfff1dc, intensity: 90 },
  rim: { color: 0xdfeaff, intensity: 1.2 },
  spots: { color: 0xfff3dd, intensity: 60, beam: 0.05 },
  sun: 2.2,
  reflections: 0.75,
  exposure: 1.0,
  wall: 0xf1e3cc,
  wallTrim: 0x3a6ea5,
  floor: 0xc8925a,
  piste: 0x3f74ad,
  podium: 0x2b3a55,
  seats: 0x33486e,
  windows: 1.6,
  boardGlow: 1.3,
  crowdLight: 0.72,
};

export const DARK_HALL: HallTheme = {
  dark: true,
  background: 0x07080f,
  fog: { color: 0x0a0c18, density: 0.03 },
  sky: 0x5a6aa8,
  ground: 0x10101a,
  hemisphere: 0.32,
  key: { color: 0xfff0d8, intensity: 160 },
  rim: { color: 0x7fa6ff, intensity: 2.2 },
  spots: { color: 0xfff1d6, intensity: 170, beam: 0.16 },
  sun: 0,
  reflections: 1,
  exposure: 1.05,
  wall: 0x1a1c2c,
  wallTrim: 0x5b3cc4,
  floor: 0x6e4a2c,
  piste: 0x2d5f9e,
  podium: 0x151a28,
  seats: 0x1b2640,
  windows: 0.08,
  boardGlow: 2.4,
  crowdLight: 0.42,
};

export function hallTheme(dark: boolean): HallTheme {
  return dark ? DARK_HALL : LIGHT_HALL;
}
