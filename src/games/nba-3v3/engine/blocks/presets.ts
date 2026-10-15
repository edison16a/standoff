import type { ShotKind } from "../shot-model";
import type { BlockHit } from "./hit";
import type { BlockJump } from "./style";

/**
 * The block presets: authored plays, each with its own leap, arm path,
 * contact and landing, picked here by the block math once the touch is
 * decided. The game logic never shows a raw collision; it shows one of
 * these, timed so the hand arrives on the ball on the contact frame.
 *
 * * rejection: two hands at the rim, the ball stuffed back out.
 * * swat: one big hand swung through it, into the stands.
 * * chase: the chase down from behind, one long arm.
 * * help: the weak side help leap, coming across.
 * * pin: the open palm pins it flat to the glass.
 * * tip: only fingertips on a jumper, which goes short.
 * * miss: the contest at full stretch that just misses.
 * * closeout: a running leap at a three point shooter, one hand high.
 */
export const BLOCK_PRESETS = ["rejection", "swat", "chase", "help", "pin", "tip", "miss", "closeout"] as const;
export type BlockPreset = (typeof BLOCK_PRESETS)[number];
/** The presets with a hand on the ball: every one but the near miss. */
export type TouchPreset = Exclude<BlockPreset, "miss">;

/** What the block math knows at the moment it decides the touch. */
export interface BlockRead {
  jump: BlockJump;
  kind: ShotKind;
  three: boolean;
  /** The hand gets there at all, and only grazes it when it does. */
  touch: boolean;
  grazing: boolean;
  /** The ball is by the glass, high enough to pin. */
  glass: boolean;
  /** How far the contact is from the middle of the ring, flat on the floor, metres. */
  rimGap: number;
  /** A strong man, who stuffs it back with both hands more often than he swings at it. */
  strong: boolean;
  /** One roll, 0 to 1, for the choice between the two plays that both fit. */
  roll: number;
}

/** Inside this far of the ring a block is at the rim. */
export const AT_RIM = 1.7;

/**
 * Picks the preset. The order is the order of what the body has already
 * committed to: a man flying in from behind or at a three shooter plays
 * that leap whatever the hand does; then the place (the glass, the rim);
 * then the strength of the man for the two that both fit.
 */
export function pickPreset(r: BlockRead): BlockPreset {
  if (!r.touch) return "miss";
  if (r.grazing) return "tip";
  if (r.jump === "chase") return "chase";
  if (r.jump === "closeout" || (r.three && r.kind === "jumper")) return "closeout";
  if (r.glass && r.kind !== "jumper") return "pin";
  if (r.jump === "help") return "help";
  if (r.kind === "dunk") return "rejection";
  if (r.rimGap < AT_RIM) return r.roll < (r.strong ? 0.75 : 0.5) ? "rejection" : "swat";
  return "swat";
}

/**
 * What the hand does to the ball for each preset, which sets off its
 * real flight. A chase down by the glass pins it there; out in the lane
 * it is slapped on ahead.
 */
export function hitFor(preset: TouchPreset, glass: boolean): BlockHit {
  switch (preset) {
    case "rejection":
      return "reject";
    case "swat":
      return "stands";
    case "chase":
      return glass ? "pin" : "swat";
    case "help":
      return "swat";
    case "pin":
      return "pin";
    case "tip":
      return "tip";
    case "closeout":
      return "deflect";
  }
}

/** A dunk met at the rim: from behind it is the chase down, off the help side the help leap, else both hands stuff it. */
export function dunkPreset(jump: BlockJump): TouchPreset {
  return jump === "chase" ? "chase" : jump === "help" ? "help" : "rejection";
}

/** Both hands go up to the ball for these; the rest strike with one. */
export const TWO_HANDED: Record<BlockPreset, boolean> = {
  rejection: true,
  swat: false,
  chase: false,
  help: true,
  pin: false,
  tip: false,
  miss: false,
  closeout: false,
};
