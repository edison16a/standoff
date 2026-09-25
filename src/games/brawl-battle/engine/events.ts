import type { HitSound, MoveKey } from "./moves";

/**
 * What happened in a step, for the host to turn into sound, shakes,
 * sparks, announcer lines and phone buzzes. The engine never plays
 * anything itself.
 */
export type MatchEvent =
  | { type: "countdown"; call: "ready" | "fight" }
  | { type: "jump"; id: number; double: boolean }
  | { type: "land"; id: number }
  | { type: "swing"; id: number; move: MoveKey }
  | {
      type: "hit";
      attacker: number;
      target: number;
      damage: number;
      sound: HitSound;
      heavy: boolean;
      /** Launch speed, for the size of the shake and the trail. */
      speed: number;
      freeze: number;
      x: number;
      y: number;
    }
  | { type: "block"; attacker: number; target: number; x: number; y: number }
  | { type: "shieldBreak"; id: number }
  | { type: "projectile"; id: number; owner: number }
  | { type: "ultReady"; id: number }
  | { type: "ult"; id: number }
  /** A fall through the blast zone. `by` is who gets the credit. */
  | { type: "ko"; id: number; by: number | null; x: number; y: number; stocksLeft: number }
  | { type: "respawn"; id: number }
  | { type: "eliminated"; id: number }
  | { type: "game"; winner: number | null }
  | { type: "over" };
