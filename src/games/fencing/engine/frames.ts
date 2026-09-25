import type { CharacterId } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";

/**
 * What a fencer is doing beyond following the live controller. "scored" is
 * the lunge that made a touch, held out while the referee calls it, so the
 * slow motion close up shows the hit and not the recovery.
 */
export type FencerAction = "idle" | "jab" | "scored" | "parry" | "hit" | "deflected" | "victory" | "defeat";

/**
 * One fencer at one instant, holding everything the renderer needs. The
 * renderer is a pure function of these frames, which is why a replay can
 * run back through the exact same drawing code as live play.
 */
export interface FencerFrame {
  slot: Slot;
  characterId: CharacterId;
  /** Position on the strip, metres from the centre line. */
  x: number;
  /** 1 faces right (player one), -1 faces left. */
  facing: 1 | -1;
  /** Live sword angles from the phone, radians. */
  pitch: number;
  yaw: number;
  roll: number;
  /** Walking speed toward the opponent, m/s. Negative is retreating. */
  speed: number;
  action: FencerAction;
  /** Milliseconds since the action started. */
  actionMs: number;
  /** True while a parry window is open, drawn as a blade glint. */
  parrying: boolean;
}

export interface SceneFrame {
  /** Engine clock, milliseconds. */
  t: number;
  fencers: [FencerFrame, FencerFrame];
}

/**
 * What the renderer draws: any number of fencers. The lobby shows only the
 * players who have picked a fencer so far, so it may be none, one or two.
 */
export interface StageFrame {
  t: number;
  fencers: readonly FencerFrame[];
}
