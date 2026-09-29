import { clampLane, type Lane } from "../engine/tuning";
import type { CameraIntent } from "./camera-input";

export type KeyMove = "left" | "right" | "jump" | "duck";

/** Keyboard mode: the arrow keys or WASD, by where the keys sit, so other keyboard layouts work the same. */
export const KEYS: Record<string, KeyMove> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "jump",
  ArrowDown: "duck",
  KeyA: "left",
  KeyD: "right",
  KeyW: "jump",
  KeyS: "duck",
};

/**
 * Turns key presses into runner input, the same shape the camera gives.
 * Each press of left or right moves one track. Up jumps once per press,
 * and down rolls, the roll lasting as long as the key is held. A key
 * held down repeating does nothing more. Pure, so tests press keys.
 */
export class KeyInput {
  private lane: Lane = 0;
  private jump = false;
  private duck = false;
  private held = false;

  /** A key went down or up. Returns a jump or a duck when one starts, for the tutorial and the results. */
  press(move: KeyMove, down: boolean, repeat = false): "jump" | "duck" | null {
    if (move === "duck") this.held = down;
    if (!down || repeat) return null;
    if (move === "left" || move === "right") {
      this.lane = clampLane(this.lane + (move === "left" ? -1 : 1));
      return null;
    }
    this[move] = true;
    return move;
  }

  /** Every key let go at once, as when the window loses focus and the key up never arrives. */
  release(): void {
    this.held = false;
  }

  /** This frame's input. Jumps and ducks are handed out once. */
  take(): CameraIntent {
    const intent: CameraIntent = { lane: this.lane, jump: this.jump, duck: this.duck, ducking: this.held };
    this.jump = this.duck = false;
    return intent;
  }

  /** Back to the middle track with nothing pending, for a new run. */
  reset(): void {
    this.lane = 0;
    this.jump = this.duck = false;
  }
}
