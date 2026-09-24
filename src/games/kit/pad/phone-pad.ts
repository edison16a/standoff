import type { PhoneRoomApi } from "@/platform/games/game-api";
import { CENTER, stickMoved, type Stick } from "./stick-math";

/** How often the stick is sampled while streaming. Fast enough for footwork. */
const SEND_MS = 1000 / 40;
/** An unchanged stick still goes out this often, so the host never goes stale. */
const KEEPALIVE_MS = 250;

/**
 * The phone side of the gamepad kit. The stick streams to the host often
 * and may drop a frame. Button presses and releases go reliably, each
 * carrying the stick at that instant, so a pass or a shot always heads
 * where the thumb was pointing.
 */
export class PhonePad {
  private stick: Stick = CENTER;
  private readonly held = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSent: Stick | null = null;
  private lastSentAt = 0;
  private heldChanged = false;

  constructor(private readonly room: PhoneRoomApi) {}

  get current(): Stick {
    return this.stick;
  }

  setStick(stick: Stick): void {
    this.stick = stick;
  }

  press(button: string): void {
    if (this.held.has(button)) return;
    this.held.add(button);
    this.heldChanged = true;
    navigator.vibrate?.(10);
    this.room.send({ kind: "pad-press", button, down: true, x: this.stick.x, y: this.stick.y });
  }

  release(button: string): void {
    if (!this.held.delete(button)) return;
    this.heldChanged = true;
    this.room.send({ kind: "pad-press", button, down: false, x: this.stick.x, y: this.stick.y });
  }

  /** Lets go of everything, for when the pad is hidden or the phone loses focus. */
  releaseAll(): void {
    for (const button of [...this.held]) this.release(button);
    this.stick = CENTER;
  }

  /** Starts or stops streaming. Games stream only while the pad is on screen. */
  stream(on: boolean): void {
    if (on) this.timer ??= setInterval(() => this.tick(), SEND_MS);
    else if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.releaseAll();
    this.stream(false);
  }

  private tick(): void {
    const now = performance.now();
    const moved = !this.lastSent || stickMoved(this.lastSent, this.stick);
    if (!moved && !this.heldChanged && now - this.lastSentAt < KEEPALIVE_MS) return;
    this.lastSent = this.stick;
    this.lastSentAt = now;
    this.heldChanged = false;
    this.room.sendLossy({ kind: "pad", x: this.stick.x, y: this.stick.y, held: [...this.held] });
  }
}
