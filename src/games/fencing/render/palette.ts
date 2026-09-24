import type { Brush, Tone } from "@/games/fencing/rig/brush";

/** Colours the canvas needs, read from the same CSS tokens the UI uses. */
export interface Palette {
  background: string;
  floor: string;
  line: string;
  muted: string;
  text: string;
  accent: string;
  /** Outline for fencer pieces: dark on a light page, light on a dark one. */
  outline: string;
}

/**
 * Reads the theme tokens off the document root. Called whenever the theme
 * changes, so the strip redraws in the new colours without a reload.
 */
export function readPalette(root: HTMLElement = document.documentElement): Palette {
  const style = getComputedStyle(root);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const dark = root.getAttribute("data-theme") === "dark";
  return {
    background: token("--bg-workspace", dark ? "#0a0b0d" : "#f2f3f5"),
    floor: token("--bg-muted", dark ? "#1c1e22" : "#e6e8eb"),
    line: token("--border-strong", dark ? "#3a3d44" : "#c8ccd2"),
    muted: token("--text-muted", "#6b7280"),
    text: token("--text", dark ? "#f3f4f6" : "#111214"),
    accent: token("--accent", "#4da3ff"),
    outline: dark ? "#d9dbe0" : "#151619",
  };
}

/** The fixed fencer tones, plus the player colour for this slot. */
export function brushTones(palette: Palette, slot: 1 | 2): Record<Tone, string> {
  return {
    paper: "#ffffff",
    light: "#dcdde0",
    mid: "#96989d",
    dark: "#46484d",
    ink: "#18191b",
    trim: slot === 1 ? palette.accent : "#ffffff",
  };
}

export function makeBrush(ctx: CanvasRenderingContext2D, palette: Palette, slot: 1 | 2, px: number): Brush {
  return { ctx, tones: brushTones(palette, slot), outline: palette.outline, px };
}
