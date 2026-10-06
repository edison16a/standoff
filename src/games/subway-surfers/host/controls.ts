import type { CameraKit, MoveEvent } from "@/games/kit/camera";
import type { Lane } from "../engine/tuning";
import { CameraInput } from "./camera-input";
import { KeyInput, KEYS, type KeyMove } from "./key-input";

/** What the player asks of their runner this frame. */
export interface Intent {
  lane: Lane;
  jump: boolean;
  duck: boolean;
  ducking: boolean;
}

/**
 * The player's input, from one of two sources. With a camera kit it
 * turns the head line into runner input: the head up out of its band
 * jumps, down out of it rolls, and the head and shoulders moving left
 * or right change track. Without one it is keyboard mode (`key-input.ts`).
 * The keys are off in camera mode, so a camera run on the leaderboard
 * was run with the body.
 */
export class Controls {
  private readonly camera = new CameraInput();
  private readonly keys: KeyInput | null;
  /** The lane last handed out, to tell listeners when a key changes it. */
  private lane: Lane = 0;
  private readonly unlisten: () => void;
  private readonly moveListeners = new Set<(event: MoveEvent) => void>();

  constructor(private readonly kit: CameraKit | null) {
    if (kit) {
      this.keys = null;
      this.unlisten = kit.onMove((event) => this.onMove(event));
      return;
    }
    const keys = (this.keys = new KeyInput());
    const down = (e: KeyboardEvent) => this.onKey(e, true);
    const up = (e: KeyboardEvent) => this.onKey(e, false);
    // A key let go while the window is in the background never tells us, so a held roll would stick.
    const blur = () => keys.release();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    this.unlisten = () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }

  /** Moves for the tutorial, for pausing when the player steps away, and for jumping to play again. */
  listen(listener: (event: MoveEvent) => void): () => void {
    this.moveListeners.add(listener);
    return () => this.moveListeners.delete(listener);
  }

  /** Takes the input for this frame. Jumps and ducks are handed out once. */
  take(now = performance.now()): Intent {
    const intent = this.keys ? this.keys.take() : (this.camera.take(this.kit?.moves(1) ?? null) ?? { lane: 0, jump: false, duck: false, ducking: false });
    // A camera lane change is told by the kit on the frame it happens, so a quick one is never
    // missed between drawn frames. A key is told here.
    if (this.keys && intent.lane !== this.lane) this.tell({ slot: 1, time: now, type: "lane", lane: intent.lane, from: this.lane });
    this.lane = intent.lane;
    return intent;
  }

  /** Forgets held moves, so a jump made during the countdown does not fire on GO, and a key run starts in the middle. */
  reset(): void {
    this.camera.reset();
    this.keys?.reset();
    this.lane = 0;
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
    this.tell(event);
  }

  /**
   * A move from the admin panel's Keyboard player. It takes the keys on
   * this page first and sends them here, so each counts once. Keyboard
   * mode only, as with the keys themselves.
   */
  remote(move: KeyMove, down: boolean): void {
    this.press(move, down, false);
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const move = KEYS[e.code];
    // Typing a name, or a shortcut like Ctrl+R, is not a move. A key the Keyboard player took arrives by `remote`.
    if (!move || !this.keys || e.defaultPrevented || e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    this.press(move, down, e.repeat);
  }

  private press(move: KeyMove, down: boolean, repeat: boolean): void {
    if (!this.keys) return;
    const started = this.keys.press(move, down, repeat);
    const time = performance.now();
    if (started === "jump") this.tell({ slot: 1, time, type: "jump", confidence: 1 });
    if (started === "duck") this.tell({ slot: 1, time, type: "duck", confidence: 1 });
  }
}
