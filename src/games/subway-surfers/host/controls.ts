import type { CameraKit, MoveEvent } from "@/games/kit/camera";
import { BodySteer } from "../engine/body-steer";
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

interface PlayerInput {
  jump: boolean;
  duck: boolean;
  keyLane: Lane | null;
  keyDuck: boolean;
  /** The lane last handed out, to tell listeners when it changes. */
  lane: Lane;
  steer: BodySteer;
}

/**
 * Turns each player's body into runner input. Jumps and ducks are caught
 * on the camera frame they happen and held until the game reads them, so
 * none is lost between frames. The lane is read fresh every frame, so a
 * step or a lean counts the moment the camera sees it. The keyboard works
 * too, for trying the game without standing up.
 */
export class Controls {
  private readonly inputs: PlayerInput[];
  private readonly unlisten: () => void;
  private readonly moveListeners = new Set<(event: MoveEvent) => void>();

  constructor(
    private readonly kit: CameraKit | null,
    private readonly players: number,
  ) {
    this.inputs = Array.from({ length: players }, () => ({ jump: false, duck: false, keyLane: null, keyDuck: false, lane: 0, steer: new BodySteer() }));
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

  /** Camera moves for the tutorial and for pausing a player who steps away, with lane changes from leans and keys too. */
  listen(listener: (event: MoveEvent) => void): () => void {
    this.moveListeners.add(listener);
    return () => this.moveListeners.delete(listener);
  }

  /** Takes a player's input for this frame. Jumps and ducks are handed out once. */
  take(slot: number, now = performance.now()): Intent {
    const input = this.inputs[slot - 1]!;
    const moves = this.kit?.moves(slot);
    const reading = moves?.calibrated ? { lane: moves.lane, offset: moves.offset, lean: moves.lean, ducking: moves.ducking } : null;
    const lane = input.keyLane ?? (reading ? input.steer.lane(reading, now) : 0);
    if (reading && input.steer.heldDuck(reading, now)) input.duck = true;
    const ducking = input.keyDuck || (!!reading && input.steer.ducking(reading, now));
    const intent: Intent = { lane, jump: input.jump, duck: input.duck, ducking };
    input.jump = false;
    input.duck = false;
    // A step is told by the kit on the camera frame it happens, so a quick one is never missed
    // between drawn frames. A lean or a key is told here.
    const stepped = input.keyLane === null && !!reading && clampLane(Math.round(reading.lane)) === lane;
    if (lane !== input.lane && !stepped) this.tell({ slot, time: now, type: "lane", lane, from: input.lane });
    input.lane = lane;
    return intent;
  }

  /** Forgets held moves, so a jump made during the countdown does not fire on GO. */
  reset(): void {
    for (const input of this.inputs) {
      input.jump = input.duck = false;
      input.steer.reset();
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
    if (event.type === "jump") input.jump = true;
    if (event.type === "land") input.steer.landed(event.time);
    if (event.type === "duck" && input.steer.duck(event.time)) input.duck = true;
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
