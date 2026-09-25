import type * as THREE from "three";
import type { Fighter } from "../../engine/fighter";
import type { Hand } from "../../engine/types";

/** What a boxer is doing around the fight, beyond punching and defending. */
export type AnimMode = "fight" | "corner" | "win" | "lose";

/**
 * A player's own arms from the camera, ready for their boxer to copy:
 * each wrist and elbow from its shoulder in the model's space, sized to
 * the boxer's arms. Null parts are not seen, and the boxer's own guard
 * fills in. The head and trunk follow the fighter's head spot instead,
 * which works the same for players and the computer.
 */
export interface MirrorInput {
  reach: Record<Hand, THREE.Vector3 | null>;
  elbow: Record<Hand, THREE.Vector3 | null>;
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
  /** The middle of the other boxer's body, where body shots dig in. */
  opponentBody: THREE.Vector3;
  /** The other boxer is covered up, so punches stop on their gloves. */
  opponentBlocking: boolean;
  mode: AnimMode;
  /** Sitting on the stool in the corner between rounds. */
  seated: boolean;
  /** Where the gloves meet to touch before a round, while this boxer holds them out, or null. */
  touchAt: THREE.Vector3 | null;
  mirror: MirrorInput | null;
  /** Light the gloves while winding up, for the computer boxer. */
  telegraph: boolean;
}
