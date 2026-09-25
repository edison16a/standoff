import type { ChargeButton } from "../types";

/**
 * What a computer fighter remembers between steps, and how good it is.
 * Bots see the match exactly as it is but only look again every few
 * frames, and a harder bot looks more often and chooses better.
 */

export const DIFFICULTIES = ["easy", "normal", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface Skill {
  /** Frames between decisions. Lower is sharper. */
  reaction: number;
  /** Chance to attack when a move would reach. */
  aggression: number;
  /** Chance to raise the shield when someone swings nearby. */
  shield: number;
  /** Chance to pick the right move for the spot, not just any attack. */
  judgement: number;
  /** Chance to use the double jump and recovery well when knocked off. */
  recovery: number;
  /** Chance a decision is a pause instead, which makes easy bots easy. */
  dither: number;
  /** Chance to wind up a charged move on a hunch, when the target is not open. */
  charge: number;
}

export const SKILLS: Record<Difficulty, Skill> = {
  easy: { reaction: 26, aggression: 0.4, shield: 0, judgement: 0.35, recovery: 0.6, dither: 0.35, charge: 0.04 },
  normal: { reaction: 13, aggression: 0.7, shield: 0.2, judgement: 0.65, recovery: 0.9, dither: 0.12, charge: 0.08 },
  hard: { reaction: 6, aggression: 0.9, shield: 0.45, judgement: 0.9, recovery: 1, dither: 0.03, charge: 0.1 },
};

export interface BotBrain {
  difficulty: Difficulty;
  /** Frames until the next decision. */
  wait: number;
  target: number | null;
  /** The stick held between decisions. */
  x: number;
  y: number;
  /** Frames left holding the shield. */
  shieldFor: number;
  /** Whether this trip off the stage has been judged yet, and whether it will be recovered well. */
  offstage: "none" | "good" | "poor";
  /** A charged move being held: the button, how many frames to charge it, and which way to face on release. */
  hold: { button: ChargeButton; frames: number; face: number } | null;
}

export function makeBrain(difficulty: Difficulty, slot: number): BotBrain {
  // Staggered so four bots do not all decide on the same frame.
  return { difficulty, wait: 8 + slot * 3, target: null, x: 0, y: 0, shieldFor: 0, offstage: "none", hold: null };
}
