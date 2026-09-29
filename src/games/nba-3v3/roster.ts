/**
 * The shapes every build is made of, and the two teams. The six builds
 * themselves live in `builds.ts`.
 */

export const DUNK_STYLES = ["scoop", "tomahawk", "reverse", "hammer", "rimhang", "flush", "cockback", "clutch", "spin360", "windmill"] as const;
export type DunkStyle = (typeof DUNK_STYLES)[number];

export type HairStyle = "buzz" | "short" | "waves" | "curly" | "swept" | "twists" | "bald";
export type BeardStyle = "none" | "stubble" | "short" | "full" | "goatee";
export type Celebration = "night" | "roar" | "calm" | "flex" | "shrug" | "shimmy" | "wrist" | "pound" | "scream" | "reach";

/** The five ratings, 1 to 10, shown as bars on the phone and used by the engine. */
export const STAT_IDS = ["speed", "shooting", "strength", "passing", "defence"] as const;
export type StatId = (typeof STAT_IDS)[number];
export type Stats = Record<StatId, number>;

export const STAT_LABELS: Record<StatId, string> = {
  speed: "Speed",
  shooting: "Shooting",
  strength: "Strength",
  passing: "Passing",
  defence: "Defence",
};

export interface Body {
  /** Standing height in metres, which also sets reach for blocks and rebounds. */
  height: number;
  /** Shoulder and chest width, 1 is average. */
  width: number;
  /** Arm and leg thickness, 1 is average. */
  bulk: number;
  /** Arm length relative to height, 1 is average. Wingspan matters for blocks. */
  reach: number;
}

export interface Look {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  beard: BeardStyle;
  headband: string | null;
  /** An arm sleeve on the left or right arm. */
  sleeve: { side: -1 | 1; color: string } | null;
  wristband: string | null;
  shoe: string;
  shoeAccent: string;
  sock: string;
  /** A mouthguard hanging from the lip. */
  mouthguard: boolean;
}

/** A stat as a share of a full bar, for the phone and the lobby. */
export function statShare(value: number): number {
  return Math.max(0.05, Math.min(1, value / 10));
}

export interface Team {
  name: string;
  color: string;
  dark: string;
  trim: string;
}

/** The two sides. Jerseys, the scoreboard and the confetti use these colours. */
export const TEAMS: readonly [Team, Team] = [
  { name: "Sky", color: "#2f6bff", dark: "#122a80", trim: "#ffffff" },
  { name: "Fire", color: "#f0263c", dark: "#7a0b1a", trim: "#ffd23f" },
];
