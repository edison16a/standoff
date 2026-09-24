import type { Seat } from "@/platform/protocol";
import type { Vec3 } from "../engine/layout";
import type { Round, Shot } from "../engine/round";
import type { GalleryPhase } from "../protocol";
import type { GalleryCamera } from "./camera";
import type { FinishId } from "./models/finishes";

/** A player with a gun on screen this frame. */
export interface Shooter {
  seat: Seat;
  finish: FinishId;
  colour: string;
  /** Where their laser lands in the booth, or null when they are not aiming. */
  aim: Vec3 | null;
}

/** What the picture reacts to, as it happens. */
export type StageEvent =
  | { type: "shot"; shot: Shot; colour: string }
  | { type: "phase"; phase: GalleryPhase; winnerColours: string[] };

/**
 * What the renderer needs from the host session. Kept as an interface so
 * the drawing code never reaches into the session's other business.
 */
export interface StageSource {
  readonly camera: GalleryCamera;
  /** Advances the game to this wall clock time, in milliseconds. */
  tick(nowMs: number): void;
  round(): Round;
  phase(): GalleryPhase;
  shooters(): readonly Shooter[];
  listen(listener: (event: StageEvent) => void): () => void;
}
