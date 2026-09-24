/**
 * The blade styles a player picks on their phone. The same colours drive
 * the preview on the phone and the trail on the big screen, so what you
 * pick is what you see.
 */

export const BLADE_IDS = ["plasma", "lightning", "fire", "ice", "venom", "rainbow", "gold"] as const;
export type BladeId = (typeof BLADE_IDS)[number];

export interface BladeLook {
  name: string;
  blurb: string;
  /** The hot white centre of the trail. */
  core: string;
  /** The wide glow around it. */
  glow: string;
  /** Sparks and embers thrown off the tip. */
  accent: string;
  /** How the trail moves: a smooth ribbon, a jagged bolt, flickering flame, or cycling colour. */
  motion: "smooth" | "bolt" | "flame" | "spectrum" | "shimmer";
}

export const BLADES: Record<BladeId, BladeLook> = {
  plasma: { name: "Plasma", blurb: "Purple plasma with a hot pink edge", core: "#fbe7ff", glow: "#a63dff", accent: "#ff4fd8", motion: "smooth" },
  lightning: { name: "Lightning", blurb: "A crackling blue bolt", core: "#f2fbff", glow: "#2f8bff", accent: "#9fe8ff", motion: "bolt" },
  fire: { name: "Fire", blurb: "Flame that sheds embers", core: "#fff4c7", glow: "#ff5a00", accent: "#ffc21a", motion: "flame" },
  ice: { name: "Ice", blurb: "Frost that leaves snow behind", core: "#ffffff", glow: "#4fd8ff", accent: "#d6f7ff", motion: "shimmer" },
  venom: { name: "Venom", blurb: "Toxic green that drips", core: "#f1ffd6", glow: "#3ddc2f", accent: "#c4ff2e", motion: "flame" },
  rainbow: { name: "Rainbow", blurb: "Every colour at once", core: "#ffffff", glow: "#ff3d7f", accent: "#ffe14d", motion: "spectrum" },
  gold: { name: "Gold", blurb: "Polished gold with glitter", core: "#fffbe8", glow: "#ffae00", accent: "#fff1a8", motion: "shimmer" },
};

export const DEFAULT_BLADE: BladeId = "plasma";

/** The rainbow blade's colour at a point along the trail and a moment in time. */
export function spectrum(along: number, timeS: number): string {
  const hue = Math.round(((along * 300 + timeS * 160) % 360 + 360) % 360);
  return `hsl(${hue} 100% 60%)`;
}
