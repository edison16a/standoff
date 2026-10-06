import type { StagePointer } from "./types";

/** As fast as the aim kit streams a phone's aim. */
const AIM_HZ = 60;

/** A point in the aim kit's space, the whole big screen from -1 to 1, y up. */
export interface AimPoint {
  x: number;
  y: number;
}

/** Where a mouse position sits on a box, in the aim kit's space. */
export function toStagePoint(clientX: number, clientY: number, box: { left: number; top: number; width: number; height: number }): AimPoint {
  if (box.width <= 0 || box.height <= 0) return { x: 0, y: 0 };
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    x: clamp(((clientX - box.left) / box.width) * 2 - 1),
    y: clamp(1 - ((clientY - box.top) / box.height) * 2),
  };
}

export interface MouseAimHandlers {
  /** The mouse moved, at most AIM_HZ times a second. Send the aim stream from here. */
  aim?(point: AimPoint): void;
  /** A mouse button went down or up, with the aim at that instant. Left is 0, right is 2. */
  button?(button: number, down: boolean, point: AimPoint): void;
}

/**
 * The mouse as a phone pointed at the screen, for the aiming games. It
 * remembers the latest point, so keys can fire where the mouse is, and
 * thins the moves to the rate a phone would stream them.
 */
export class MouseAim {
  private last: AimPoint = { x: 0, y: 0 };
  private sentAt = -Infinity;
  private pending = false;

  constructor(
    private readonly handlers: MouseAimHandlers,
    private readonly now: () => number = () => performance.now(),
  ) {}

  get point(): AimPoint {
    return this.last;
  }

  /** Feed every StagePointer here. */
  pointer(event: StagePointer): void {
    this.last = { x: event.x, y: event.y };
    if (event.type !== "move") {
      this.handlers.button?.(event.button, event.type === "down", this.last);
      return;
    }
    const time = this.now();
    if (time - this.sentAt < 1000 / AIM_HZ) {
      this.pending = true;
      return;
    }
    this.flush(time);
  }

  /** Call from the binding's tick, so the last move of a quick flick is never lost. */
  tick(): void {
    if (this.pending) this.flush(this.now());
  }

  private flush(time: number): void {
    this.pending = false;
    this.sentAt = time;
    this.handlers.aim?.(this.last);
  }
}
