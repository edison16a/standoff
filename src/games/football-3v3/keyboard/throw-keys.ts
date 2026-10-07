import type { AimPoint, KeyboardContext } from "@/platform/keyboard";
import type { StickVector } from "@/platform/keyboard";

/**
 * Where the QB stands on the big screen, roughly: low in the middle of
 * the broadcast picture. The mouse aims from here, so pointing at a
 * receiver on screen aims at him the way the phone's throw stick does.
 */
const QB_ON_SCREEN: AimPoint = { x: 0, y: -0.3 };
/** The big screen is wider than it is tall, and the aim space is square. */
const ASPECT = 16 / 9;

/** A mouse point as a throw stick: the way from the QB to the pointer, length 1. */
export function mouseStick(point: AimPoint): StickVector | null {
  const x = (point.x - QB_ON_SCREEN.x) * ASPECT;
  const y = point.y - QB_ON_SCREEN.y;
  const l = Math.hypot(x, y);
  return l < 0.05 ? null : { x: x / l, y: y / l };
}

/**
 * The throw on keys: hold Space (or the left mouse button) as a thumb
 * holds the phone's throw stick. The arrows aim, or the mouse when no
 * arrow is held, or straight up the field when neither has said
 * anything. Letting go throws; how long it was held makes no difference.
 */
export class ThrowKeys {
  private held = false;
  private sent: StickVector | null = null;

  constructor(private readonly ctx: KeyboardContext) {}

  get holding(): boolean {
    return this.held;
  }

  start(): void {
    this.held = true;
    this.sent = null;
  }

  /** Streams the aim while held, as the phone streams its throw stick. */
  tick(aim: StickVector | null): void {
    if (!this.held || !aim) return;
    if (this.sent && Math.abs(aim.x - this.sent.x) < 0.02 && Math.abs(aim.y - this.sent.y) < 0.02) return;
    this.sent = aim;
    this.ctx.sendLossy({ kind: "aim", x: aim.x, y: aim.y });
  }

  /** Let go: throw where it aims. */
  release(aim: StickVector | null): void {
    if (!this.held) return;
    const to = aim ?? { x: 0, y: 1 };
    this.held = false;
    this.sent = null;
    this.ctx.send({ kind: "throw", x: to.x, y: to.y });
  }

  /** The window lost focus or the chance to throw went: no throw. */
  cancel(): void {
    this.held = false;
    this.sent = null;
  }
}
