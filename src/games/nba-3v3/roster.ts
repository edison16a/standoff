/**
 * The ten stars, in one place so the roster is easy to edit. Each is a
 * stylised athlete, recognisable by build, skin tone, hair, beard and a
 * signature detail, never a photographic likeness. Stats run 1 to 10 and
 * follow each player's style: Ashby shoots, Varelas bullies, Delacroix
 * reaches everything.
 */

export const CHARACTER_IDS = ["ashby", "whitlock", "crane", "varelas", "vukmir", "zupan", "fontaine", "mensah", "holloway", "delacroix"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export const DUNK_STYLES = ["scoop", "tomahawk", "reverse", "hammer", "rimhang", "flush", "cockback", "clutch", "spin360", "windmill"] as const;
export type DunkStyle = (typeof DUNK_STYLES)[number];

export type HairStyle = "buzz" | "short" | "waves" | "curly" | "swept" | "twists" | "bald";
export type BeardStyle = "none" | "stubble" | "short" | "full" | "goatee";
export type Celebration = "night" | "roar" | "calm" | "flex" | "shrug" | "shimmy" | "wrist" | "pound" | "scream" | "reach";

export interface Stats {
  speed: number;
  shooting: number;
  strength: number;
}

export interface Build {
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
  /** A mouthguard hanging from the lip, Ashby's tell. */
  mouthguard: boolean;
}

export interface Character {
  id: CharacterId;
  name: string;
  /** What the scoreboard and the banners call them. */
  short: string;
  number: number;
  position: string;
  blurb: string;
  stats: Stats;
  build: Build;
  look: Look;
  dunk: DunkStyle;
  dunkName: string;
  celebration: Celebration;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  ashby: {
    id: "ashby", name: "Julian Ashby", short: "Ashby", number: 30, position: "Guard",
    blurb: "Limitless range and the quickest release in the game.",
    stats: { speed: 8, shooting: 10, strength: 4 },
    build: { height: 1.88, width: 0.92, bulk: 0.9, reach: 0.98 },
    look: { skin: "#a86f4c", hair: "short", hairColor: "#1d1510", beard: "stubble", headband: null, sleeve: null, wristband: null, shoe: "#1f3a8a", shoeAccent: "#fbbf24", sock: "#ffffff", mouthguard: true },
    dunk: "scoop", dunkName: "Scoop flush", celebration: "night",
  },
  whitlock: {
    id: "whitlock", name: "Dante Whitlock", short: "Whitlock", number: 23, position: "Forward",
    blurb: "A freight train downhill with the vision of a point guard.",
    stats: { speed: 8, shooting: 7, strength: 10 },
    build: { height: 2.06, width: 1.18, bulk: 1.22, reach: 1.02 },
    look: { skin: "#5b3a26", hair: "buzz", hairColor: "#151010", beard: "full", headband: "#ffffff", sleeve: null, wristband: null, shoe: "#fdb927", shoeAccent: "#552583", sock: "#ffffff", mouthguard: false },
    dunk: "tomahawk", dunkName: "Tomahawk", celebration: "roar",
  },
  crane: {
    id: "crane", name: "Elias Crane", short: "Crane", number: 7, position: "Forward",
    blurb: "Seven feet of silky jumper that nobody can block.",
    stats: { speed: 7, shooting: 9, strength: 6 },
    build: { height: 2.11, width: 0.94, bulk: 0.82, reach: 1.06 },
    look: { skin: "#5e3b26", hair: "buzz", hairColor: "#141010", beard: "short", headband: null, sleeve: { side: -1, color: "#111111" }, wristband: null, shoe: "#e5e7eb", shoeAccent: "#ce1141", sock: "#ffffff", mouthguard: false },
    dunk: "reverse", dunkName: "Reverse slam", celebration: "calm",
  },
  varelas: {
    id: "varelas", name: "Nikos Varelas", short: "Varelas", number: 34, position: "Forward",
    blurb: "Unstoppable in transition. Two strides from the arc to the rim.",
    stats: { speed: 9, shooting: 4, strength: 10 },
    build: { height: 2.11, width: 1.14, bulk: 1.12, reach: 1.1 },
    look: { skin: "#4b2e1e", hair: "buzz", hairColor: "#120d0b", beard: "short", headband: null, sleeve: null, wristband: "#00471b", shoe: "#00471b", shoeAccent: "#eee1c6", sock: "#ffffff", mouthguard: false },
    dunk: "hammer", dunkName: "Two hand hammer", celebration: "flex",
  },
  vukmir: {
    id: "vukmir", name: "Stefan Vukmir", short: "Vukmir", number: 15, position: "Center",
    blurb: "Soft touch, no look passes and a body nobody moves.",
    stats: { speed: 4, shooting: 8, strength: 9 },
    build: { height: 2.11, width: 1.2, bulk: 1.28, reach: 0.98 },
    look: { skin: "#e8c3a2", hair: "short", hairColor: "#5a3b22", beard: "stubble", headband: null, sleeve: null, wristband: null, shoe: "#0e2240", shoeAccent: "#fec524", sock: "#ffffff", mouthguard: false },
    dunk: "rimhang", dunkName: "Rim hang", celebration: "shrug",
  },
  zupan: {
    id: "zupan", name: "Tomaz Zupan", short: "Zupan", number: 77, position: "Guard",
    blurb: "Step back threes and a strong frame that bumps you off.",
    stats: { speed: 5, shooting: 9, strength: 8 },
    build: { height: 2.01, width: 1.1, bulk: 1.15, reach: 1.0 },
    look: { skin: "#ecc6a3", hair: "swept", hairColor: "#6a4527", beard: "short", headband: null, sleeve: null, wristband: null, shoe: "#1d1d1f", shoeAccent: "#38bdf8", sock: "#ffffff", mouthguard: false },
    dunk: "flush", dunkName: "One hand flush", celebration: "shimmy",
  },
  fontaine: {
    id: "fontaine", name: "Andre Fontaine", short: "Fontaine", number: 2, position: "Guard",
    blurb: "Silky footwork, a deadly midrange and quick hands.",
    stats: { speed: 9, shooting: 9, strength: 5 },
    build: { height: 1.98, width: 0.96, bulk: 0.86, reach: 1.04 },
    look: { skin: "#6a432d", hair: "twists", hairColor: "#16100c", beard: "none", headband: null, sleeve: null, wristband: "#ffffff", shoe: "#f5f5f4", shoeAccent: "#ef3b24", sock: "#111111", mouthguard: false },
    dunk: "cockback", dunkName: "Cock back slam", celebration: "wrist",
  },
  mensah: {
    id: "mensah", name: "Kofi Mensah", short: "Mensah", number: 0, position: "Forward",
    blurb: "A smooth scorer from anywhere with size on the wing.",
    stats: { speed: 7, shooting: 8, strength: 7 },
    build: { height: 2.03, width: 1.02, bulk: 0.98, reach: 1.02 },
    look: { skin: "#7a4e34", hair: "short", hairColor: "#17110d", beard: "short", headband: null, sleeve: { side: 1, color: "#ffffff" }, wristband: null, shoe: "#007a33", shoeAccent: "#ffffff", sock: "#ffffff", mouthguard: false },
    dunk: "clutch", dunkName: "Double clutch", celebration: "pound",
  },
  holloway: {
    id: "holloway", name: "Darius Holloway", short: "Holloway", number: 5, position: "Guard",
    blurb: "Explosive, fearless and always hunting a poster.",
    stats: { speed: 9, shooting: 7, strength: 8 },
    build: { height: 1.93, width: 1.1, bulk: 1.12, reach: 1.0 },
    look: { skin: "#583924", hair: "waves", hairColor: "#110c09", beard: "goatee", headband: null, sleeve: null, wristband: "#78be20", shoe: "#0c2340", shoeAccent: "#78be20", sock: "#ffffff", mouthguard: false },
    dunk: "spin360", dunkName: "Three sixty", celebration: "scream",
  },
  delacroix: {
    id: "delacroix", name: "Mathis Delacroix", short: "Delacroix", number: 1, position: "Center",
    blurb: "An alien wingspan. Blocks from anywhere and shoots over everyone.",
    stats: { speed: 6, shooting: 7, strength: 6 },
    build: { height: 2.24, width: 0.98, bulk: 0.8, reach: 1.14 },
    look: { skin: "#5b3925", hair: "curly", hairColor: "#130e0b", beard: "none", headband: null, sleeve: null, wristband: "#c4ced4", shoe: "#111111", shoeAccent: "#c4ced4", sock: "#111111", mouthguard: false },
    dunk: "windmill", dunkName: "Windmill", celebration: "reach",
  },
};

export function isCharacterId(value: string): value is CharacterId {
  return (CHARACTER_IDS as readonly string[]).includes(value);
}

/** Five pips for the phone and lobby cards, from a 1 to 10 stat. */
export function statPips(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value / 2)));
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
