import type { MoveEvent, MoveState } from "@/games/kit/camera";
import { clampLane, type Lane } from "../engine/tuning";

/** What the camera asks of one runner this frame. */
export interface CameraIntent {
  /** The track, from the head and shoulders moving left or right of home. */
  lane: Lane;
  /** The head went up out of its band. Handed out once. */
  jump: boolean;
  /** The head went down out of its band: roll. Handed out once. */
  duck: boolean;
  /** The head is still below its band, so the roll holds. */
  ducking: boolean;
}

/**
 * Turns one player's head line moves into runner input. The kit already
 * waits out bobbing and the bend of a landing, so a jump or a duck is
 * caught on the camera frame it happens and held until the game reads
 * it, and none is lost between drawn frames. Pure, so tests feed it moves.
 */
export class CameraInput {
  private jump = false;
  private duck = false;

  see(event: MoveEvent): void {
    if (event.type === "jump") this.jump = true;
    if (event.type === "duck") this.duck = true;
  }

  /** This frame's input from the player's move state, or null before calibration. */
  take(moves: MoveState | null): CameraIntent | null {
    if (!moves?.calibrated) return null;
    const intent: CameraIntent = { lane: clampLane(moves.lane), jump: this.jump, duck: this.duck, ducking: moves.ducking };
    this.jump = this.duck = false;
    return intent;
  }

  /** Forgets held moves, so a jump made during the countdown does not fire on GO. */
  reset(): void {
    this.jump = this.duck = false;
  }
}
