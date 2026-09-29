import type { CameraKit, MoveEvent } from "@/games/kit/camera";
import { clampLane, type Lane } from "../engine/tuning";
import { CameraInput } from "./camera-input";

/** What the player asks of their runner this frame. */
export interface Intent {
  lane: Lane;
  jump: boolean;
  duck: boolean;
  ducking: boolean;
}

/** The arrow keys, for testing without a camera. */
const KEYS: Record<string, "left" | "right" | "jump" | "duck"> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "jump",
  ArrowDown: "duck",
};

/**
 * Turns the player's head line into runner input: the head up out of
 * its band jumps, down out of it rolls, and the head and shoulders
 * moving left or right change track. Only the upper body counts, so
 * the player stands waist up. The keyboard works too, for trying the
 * game without standing up.
 */
export class Controls {
  private jump = false;
  private duck = false;
  private keyLane: Lane | null = null;
  private keyDuck = false;
  /** The lane last handed out, to tell listeners when it changes. */
  private lane: Lane = 0;
  private readonly camera = new CameraInput();
  private readonly unlisten: () => void;
  private readonly moveListeners = new Set<(event: MoveEvent) => void>();

  constructor(private readonly kit: CameraKit | null) {
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

  /** Camera moves for the tutorial and for pausing when the player steps away, with lane changes from keys too. */
  listen(listener: (event: MoveEvent) => void): () => void {
    this.moveListeners.add(listener);
    return () => this.moveListeners.delete(listener);
  }

  /** Takes the input for this frame. Jumps and ducks are handed out once. */
  take(now = performance.now()): Intent {
    const camera = this.camera.take(this.kit?.moves(1) ?? null);
    const lane = this.keyLane ?? camera?.lane ?? 0;
    const intent: Intent = {
      lane,
      jump: this.jump || !!camera?.jump,
      duck: this.duck || !!camera?.duck,
      ducking: this.keyDuck || !!camera?.ducking,
    };
    this.jump = false;
    this.duck = false;
    // A camera lane change is told by the kit on the frame it happens, so a quick one is never
    // missed between drawn frames. A key is told here.
    if (lane !== this.lane && this.keyLane !== null) this.tell({ slot: 1, time: now, type: "lane", lane, from: this.lane });
    this.lane = lane;
    return intent;
  }

  /** Forgets held moves, so a jump made during the countdown does not fire on GO. */
  reset(): void {
    this.jump = this.duck = false;
    this.camera.reset();
  }

  dispose(): void {
    this.unlisten();
    this.moveListeners.clear();
  }

  private tell(event: MoveEvent): void {
    for (const listener of this.moveListeners) listener(event);
  }

  private onMove(event: MoveEvent): void {
    if (event.slot !== 1) return;
    this.camera.see(event);
    // A body move takes the lane back from the keys.
    if (event.type === "lane") this.keyLane = null;
    this.tell(event);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const move = KEYS[e.code];
    if (!move || e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    if (move === "duck") this.keyDuck = down;
    if (!down || e.repeat) return;
    const time = performance.now();
    if (move === "left" || move === "right") {
      this.keyLane = clampLane((this.keyLane ?? this.lane) + (move === "left" ? -1 : 1));
      return;
    }
    this[move] = true;
    this.tell(move === "jump" ? { slot: 1, time, type: "jump", confidence: 1 } : { slot: 1, time, type: "duck", confidence: 1 });
  }
}
