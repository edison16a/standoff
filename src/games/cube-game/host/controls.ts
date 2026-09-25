import type { CameraKit, MoveEvent } from "@/games/kit/camera";

/** One body jump is one press. Anything sooner than this after the last is the same jump read twice. */
const REFRACTORY_MS = 260;

/** Keys for playing without the camera. Space is always player one. */
const KEYS: Record<string, number> = { Space: 1, KeyW: 1, Enter: 2, ArrowUp: 2, Numpad0: 2 };

/**
 * Turns jumps into presses: a real jump seen by the camera, or a key.
 * Camera jumps arrive on the camera frame they start, apart from the
 * render loop, so none waits for the next drawing. Players stepping out
 * of view and back are passed on too, so their run can pause.
 */
export class Controls {
  private readonly last = [0, 0, 0];
  private readonly unlisten: () => void;

  constructor(
    kit: CameraKit | null,
    private readonly players: number,
    private readonly onPress: (slot: number, pageMs: number) => void,
    private readonly onPresence: (slot: number, present: boolean) => void,
  ) {
    const stopKit = kit?.onMove((event) => this.onMove(event)) ?? (() => undefined);
    const down = (event: KeyboardEvent) => this.onKey(event);
    window.addEventListener("keydown", down);
    this.unlisten = () => {
      stopKit();
      window.removeEventListener("keydown", down);
    };
  }

  dispose(): void {
    this.unlisten();
  }

  private press(slot: number, time: number): void {
    if (slot > this.players || time - (this.last[slot] ?? 0) < REFRACTORY_MS) return;
    this.last[slot] = time;
    this.onPress(slot, time);
  }

  private onMove(event: MoveEvent): void {
    if (event.type === "jump") this.press(event.slot, event.time);
    if (event.type === "away") this.onPresence(event.slot, false);
    if (event.type === "back") this.onPresence(event.slot, true);
  }

  private onKey(event: KeyboardEvent): void {
    // With one player, the second player's keys work for them too.
    const slot = this.players === 1 && KEYS[event.code] ? 1 : KEYS[event.code];
    if (!slot || event.repeat || event.target instanceof HTMLInputElement) return;
    // Space would otherwise press whichever button has focus.
    event.preventDefault();
    // The event's own time stamp is when the key went down, even if a slow frame kept it waiting.
    this.press(slot, event.timeStamp || performance.now());
  }
}
