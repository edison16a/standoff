import type { ControllerFrame } from "@/games/blade-clash/motion/motion-pipeline";

/** How often the live sword reading is sampled. Matches the host's tick. */
const SEND_INTERVAL_MS = 1000 / 60;
/**
 * Frames that differ by less than this are not worth sending. Every frame
 * is one Redis command on Vercel, and a phone held still in guard would
 * otherwise spend 60 of them a second saying nothing new.
 */
const ANGLE_EPSILON = 0.004;
const MOVE_EPSILON = 0.01;
/** Even an unchanged reading goes out this often, so the host never goes stale. */
const KEEPALIVE_MS = 250;

function changed(a: ControllerFrame, b: ControllerFrame): boolean {
  return (
    Math.abs(a.pitch - b.pitch) > ANGLE_EPSILON ||
    Math.abs(a.yaw - b.yaw) > ANGLE_EPSILON ||
    Math.abs(a.roll - b.roll) > ANGLE_EPSILON ||
    Math.abs(a.move - b.move) > MOVE_EPSILON
  );
}

/**
 * Streams the live controller reading to the host at up to 60 Hz, but only
 * when it actually moved, with a slow keepalive otherwise. Strikes do not
 * go through here: they are sent the instant they are detected.
 */
export class MotionStream {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSent: ControllerFrame | null = null;
  private lastSentAt = 0;

  constructor(
    private readonly read: () => ControllerFrame,
    private readonly send: (frame: ControllerFrame) => void,
    /** Whether the host wants readings right now (it is drawing this fencer). */
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
