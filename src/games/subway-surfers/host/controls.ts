import type { CameraKit, MoveEvent } from "@/games/kit/camera";
import { clampLane, type Lane } from "../engine/tuning";

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

/**
 * Turns each player's body into runner input. Jumps and ducks are caught
 * on the camera frame they happen and held until the game reads them, so
 * none is lost between frames. The lane is read fresh every frame, so a
 * step across counts the moment the camera sees it. The keyboard works
 * too, for trying the game without standing up.
 */
export class Controls {
  private readonly pending: { jump: boolean; duck: boolean }[];
  private readonly keyLane: (Lane | null)[];
  private readonly keyDuck: boolean[];
  private readonly unlisten: () => void;
  private readonly moveListeners = new Set<(event: MoveEvent) => void>();

  constructor(
    private readonly kit: CameraKit | null,
    private readonly players: number,
  ) {
    this.pending = Array.from({ length: players }, () => ({ jump: false, duck: false }));
    this.keyLane = Array.from({ length: players }, () => null);
    this.keyDuck = Array.from({ length: players }, () => false);
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

  /** Every camera move, for the tutorial and for pausing a player who steps away. */
  listen(listener: (event: MoveEvent) => void): () => void {
    this.moveListeners.add(listener);
    return () => this.moveListeners.delete(listener);
  }

  /** Takes a player's input for this frame. Jumps and ducks are handed out once. */
  take(slot: number): Intent {
    const i = slot - 1;
    const moves = this.kit?.moves(slot);
    const lane = this.keyLane[i] ?? (moves?.calibrated ? clampLane(Math.round(moves.lane)) : 0);
    const pending = this.pending[i]!;
    const intent: Intent = { lane, jump: pending.jump, duck: pending.duck, ducking: this.keyDuck[i]! || !!moves?.ducking };
    pending.jump = false;
    pending.duck = false;
    return intent;
  }

  /** Forgets held moves, so a jump made during the countdown does not fire on GO. */
  reset(): void {
    for (const p of this.pending) p.jump = p.duck = false;
  }

  dispose(): void {
    this.unlisten();
    this.moveListeners.clear();
  }

  private onMove(event: MoveEvent): void {
    const pending = this.pending[event.slot - 1];
    if (!pending) return;
    if (event.type === "jump") pending.jump = true;
    if (event.type === "duck") pending.duck = true;
    // A body move takes the lane back from the keys.
    if (event.type === "lane") this.keyLane[event.slot - 1] = null;
    for (const listener of this.moveListeners) listener(event);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const key = KEYS[e.code];
    if (!key || key.slot > this.players || e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    const i = key.slot - 1;
    const time = performance.now();
    if (key.move === "duck") this.keyDuck[i] = down;
    if (!down || e.repeat) return;
    const from = this.keyLane[i] ?? clampLane(Math.round(this.kit?.moves(key.slot)?.lane ?? 0));
    let event: MoveEvent | null = null;
    if (key.move === "left" || key.move === "right") {
      const lane = clampLane(from + (key.move === "left" ? -1 : 1));
      this.keyLane[i] = lane;
      event = { slot: key.slot, time, type: "lane", lane, from };
    } else {
      this.pending[i]![key.move] = true;
      event = key.move === "jump" ? { slot: key.slot, time, type: "jump", confidence: 1 } : { slot: key.slot, time, type: "duck", confidence: 1 };
    }
    for (const listener of this.moveListeners) listener(event);
  }
}
