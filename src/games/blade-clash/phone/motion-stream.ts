import type { MotionMessage } from "@/games/blade-clash/protocol";

export type ControllerFrame = Omit<MotionMessage, "kind">;

/** How often the sword is sampled. Matches the host's tick. */
const SEND_INTERVAL_MS = 1000 / 60;
/**
 * Frames that differ by less than this are not worth sending. Every frame
 * is one Redis command on Vercel, and a phone held still in guard would
 * otherwise spend 60 of them a second saying nothing new.
 */
const ANGLE_EPSILON = 0.004;
const AMOUNT_EPSILON = 0.01;
/** Even an unchanged reading goes out this often, so the host never goes stale. */
const KEEPALIVE_MS = 250;

function changed(a: ControllerFrame, b: ControllerFrame): boolean {
  return (
    Math.abs(a.yaw - b.yaw) > ANGLE_EPSILON ||
    Math.abs(a.pitch - b.pitch) > ANGLE_EPSILON ||
    Math.abs(a.roll - b.roll) > ANGLE_EPSILON ||
    Math.abs(a.reach - b.reach) > AMOUNT_EPSILON ||
    Math.abs(a.move - b.move) > AMOUNT_EPSILON
  );
}

/**
 * Streams how the sword is held to the host at up to 60 Hz, but only when
 * it actually moved, with a slow keepalive otherwise.
 */
export class MotionStream {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSent: ControllerFrame | null = null;
  private lastSentAt = 0;

  constructor(
    private readonly read: () => ControllerFrame,
    private readonly send: (frame: ControllerFrame) => void,
    /** Whether the host wants readings right now: it is drawing this fighter. */
    private readonly wanted: () => boolean,
  ) {}

  start(): void {
    this.timer ??= setInterval(() => this.tick(), SEND_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    if (!this.wanted()) return;
    const frame = this.read();
    const now = performance.now();
    if (this.lastSent && !changed(this.lastSent, frame) && now - this.lastSentAt < KEEPALIVE_MS) return;
    this.lastSent = frame;
    this.lastSentAt = now;
    this.send(frame);
  }
}
