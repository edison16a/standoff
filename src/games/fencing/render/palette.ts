import type { Brush } from "@/games/fencing/rig/brush";

/** The colours the strip is drawn in. Fencing keeps its own, apart from the platform's. */
export interface Palette {
  /** The hall wall behind the strip. */
  background: string;
  /** The painted rail along the hall wall. */
  rail: string;
  /** The hall floor the strip lies on. */
  floor: string;
  /** The strip itself. */
  strip: string;
  /** Markings on the strip. */
  line: string;
  muted: string;
  text: string;
  /** Hot metal: parry sparks, the impact ring and the touch flash. */
  spark: string;
  /** Red and green, like the scoring lamps on a real strip. */
  players: { 1: string; 2: string };
  confetti: string[];
  /** Outline for fencer pieces: dark on a light hall, light on a dark one. */
  outline: string;
}

const PLAYERS = { 1: "#ff4757", 2: "#2ed573" };
const CONFETTI = ["#ff4757", "#2ed573", "#ffd23f", "#3a86ff", "#ff7ad9", "#ff9f1c"];

const LIGHT: Palette = {
  background: "#fdf0dc",
  rail: "#f6d9ae",
  floor: "#efd3a8",
  strip: "#3a6ea5",
  line: "#e9f1ff",
  muted: "#7a6a58",
  text: "#1b1a2e",
  spark: "#ffb400",
  players: PLAYERS,
  confetti: CONFETTI,
  outline: "#1b1a2e",
};

const DARK: Palette = {
  background: "#15132b",
  rail: "#1d1a3a",
  floor: "#221f45",
  strip: "#2b4f8a",
  line: "#cfe0ff",
  muted: "#9a95c4",
  text: "#f3f1ff",
  spark: "#ffd23f",
  players: PLAYERS,
  confetti: CONFETTI,
  outline: "#e6e3ff",
};

/** Picks the hall for the current theme. Called again whenever the theme flips. */
export function readPalette(root: HTMLElement = document.documentElement): Palette {
  return root.getAttribute("data-theme") === "dark" ? DARK : LIGHT;
}

export function makeBrush(ctx: CanvasRenderingContext2D, palette: Palette, slot: 1 | 2, px: number): Brush {
  return { ctx, trim: palette.players[slot], outline: palette.outline, px };
}
