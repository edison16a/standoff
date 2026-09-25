import type { CameraKit, MoveEvent } from "@/games/kit/camera";
import { clampLane, type Lane } from "../engine/tuning";
import { CameraInput } from "./camera-input";

/** What one player asks of their runner this frame. */
export interface Intent {
  lane: Lane;
  jump: boolean;
  duck: boolean;
  ducking: boolean;
}

/** Keys for testing without a camera: arrows for player one, WASD for player two. */
const KEYS: Record<string, { slot: number; move: "left" | "right" | "jump" | "duck" }> = {
  ArrowLeft: { slot: 1, move: "left" },
  ArrowRight: { slot: 1, move: "right" },
  ArrowUp: { slot: 1, move: "jump" },
  ArrowDown: { slot: 1, move: "duck" },
  KeyA: { slot: 2, move: "left" },
  KeyD: { slot: 2, move: "right" },
  KeyW: { slot: 2, move: "jump" },
  KeyS: { slot: 2, move: "duck" },
};

interface PlayerInput {
  jump: boolean;
  duck: boolean;
  keyLane: Lane | null;
  keyDuck: boolean;
  /** The lane last handed out, to tell listeners when it changes. */
  lane: Lane;
  camera: CameraInput;
}

/**
 * Turns each player's head line into runner input: the head up out of
 * its band jumps, down out of it rolls, and the head and shoulders
 * moving left or right change track. Only the upper body counts, so
 * players stand waist up. The keyboard works too, for trying the game
 * without standing up.
 */
export class Controls {
  private readonly inputs: PlayerInput[];
  private readonly unlisten: () => void;
  private readonly moveListeners = new Set<(event: MoveEvent) => void>();

  constructor(
    private readonly kit: CameraKit | null,
    private readonly players: number,
  ) {
    this.inputs = Array.from({ length: players }, () => ({ jump: false, duck: false, keyLane: null, keyDuck: false, lane: 0, camera: new CameraInput() }));
    const stopKit = kit?.onMove((event) => this.onMove(event)) ?? (() => undefined);
    const down = (e: KeyboardEvent) => this.onKey(e, true);
    const up = (e: KeyboardEvent) => this.onKey(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    this.unlisten = () => {
      stopKit();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }

  /** Camera moves for the tutorial and for pausing a player who steps away, with lane changes from keys too. */
  listen(listener: (event: MoveEvent) => void): () => void {
    this.moveListeners.add(listener);
    return () => this.moveListeners.delete(listener);
  }

  /** Takes a player's input for this frame. Jumps and ducks are handed out once. */
  take(slot: number, now = performance.now()): Intent {
    const input = this.inputs[slot - 1]!;
    const camera = input.camera.take(this.kit?.moves(slot) ?? null);
    const lane = input.keyLane ?? camera?.lane ?? 0;
    const intent: Intent = {
      lane,
      jump: input.jump || !!camera?.jump,
      duck: input.duck || !!camera?.duck,
      ducking: input.keyDuck || !!camera?.ducking,
    };
    input.jump = false;
    input.duck = false;
    // A camera lane change is told by the kit on the frame it happens, so a quick one is never
    // missed between drawn frames. A key is told here.
    if (lane !== input.lane && input.keyLane !== null) this.tell({ slot, time: now, type: "lane", lane, from: input.lane });
    input.lane = lane;
    return intent;
  }

  /** Forgets held moves, so a jump made during the countdown does not fire on GO. */
  reset(): void {
    for (const input of this.inputs) {
      input.jump = input.duck = false;
      input.camera.reset();
    }
  }

  dispose(): void {
    this.unlisten();
    this.moveListeners.clear();
  }

  private tell(event: MoveEvent): void {
    for (const listener of this.moveListeners) listener(event);
  }

  private onMove(event: MoveEvent): void {
    const input = this.inputs[event.slot - 1];
    if (!input) return;
    input.camera.see(event);
    // A body move takes the lane back from the keys.
    if (event.type === "lane") input.keyLane = null;
    this.tell(event);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const key = KEYS[e.code];
    if (!key || key.slot > this.players || e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    const input = this.inputs[key.slot - 1]!;
    if (key.move === "duck") input.keyDuck = down;
    if (!down || e.repeat) return;
    const time = performance.now();
    if (key.move === "left" || key.move === "right") {
      input.keyLane = clampLane((input.keyLane ?? input.lane) + (key.move === "left" ? -1 : 1));
      return;
    }
    input[key.move] = true;
    this.tell(key.move === "jump" ? { slot: key.slot, time, type: "jump", confidence: 1 } : { slot: key.slot, time, type: "duck", confidence: 1 });
  }
}
