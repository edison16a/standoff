import type { CharacterId } from "@/games/blade-clash/characters";
import type { Slot } from "@/games/blade-clash/players";
import type { SwordControl, SwordPose } from "./sword";

/**
 * What a fighter is doing beyond walking and holding their sword. "hit"
 * is the flinch after taking a hit, "stagger" the shake after a clash.
 */
export type FighterAction = "idle" | "hit" | "stagger" | "defeat" | "victory";

/**
 * One fighter at one instant, holding everything the renderer needs. The
 * renderer is a pure function of these frames and never decides anything.
 */
export interface FighterFrame {
  slot: Slot;
  characterId: CharacterId;
  /** Position on the line, metres from the middle. */
  x: number;
  /** 1 faces along +x (player one), -1 faces back. */
  facing: 1 | -1;
  /** Walking speed toward the opponent, m/s. Negative is backing off. */
  speed: number;
  health: number;
  action: FighterAction;
  /** Milliseconds since the action started. */
  actionMs: number;
  /** The hold, as the sword shows it. */
  control: SwordControl;
  /** The sword in the world. */
  sword: SwordPose;
  /** 1 while a clash has thrown the sword, easing to 0 as it returns. */
  knocked: number;
}

export interface SceneFrame {
  /** Engine clock, milliseconds. */
  t: number;
  fighters: [FighterFrame, FighterFrame];
}

/**
 * What the renderer draws: any number of fighters. The lobby shows only
 * the players who have picked someone so far, so it may be none, one or two.
 */
export interface StageFrame {
  t: number;
  fighters: readonly FighterFrame[];
}
