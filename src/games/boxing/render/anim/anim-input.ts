import type * as THREE from "three";
import type { Fighter } from "../../engine/fighter";
import type { Hand } from "../../engine/types";

/** What a boxer is doing around the fight, beyond punching and defending. */
export type AnimMode = "fight" | "corner" | "win" | "lose";

/**
 * A player's own body from the camera, ready for their boxer to copy:
 * each wrist and elbow from its shoulder in the model's space, sized to
 * the boxer's arms, plus how far they lean and crouch. Null parts are
 * not seen, and the boxer's own guard fills in.
 */
export interface MirrorInput {
  reach: Record<Hand, THREE.Vector3 | null>;
  elbow: Record<Hand, THREE.Vector3 | null>;
  /** -1 to 1, positive toward the boxer's own left. */
  lean: number;
  /** 0 standing tall to 1 deep in a duck. */
  crouch: number;
}

/** Everything one boxer's animation needs for a frame. */
export interface AnimInput {
  /** The match clock in milliseconds, which punches are timed on. */
  now: number;
  /** A free running clock in seconds, for breathing and bouncing. */
  time: number;
  dt: number;
  x: number;
  z: number;
  facing: number;
  fighter: Fighter;
  /** Damage taken so far, which marks the face. */
  damageTaken: number;
  round: number;
  /** The middle of the other boxer's face, in the world. */
  opponentFace: THREE.Vector3;
  /** The other boxer is covered up, so punches stop on their gloves. */
  opponentBlocking: boolean;
  mode: AnimMode;
  mirror: MirrorInput | null;
  /** Light the gloves while winding up, for the computer boxer. */
  telegraph: boolean;
}
