/** No new frame in this long means the browser is not calling back for this video, so polling takes over. */
const WATCHDOG_MS = 1500;

/**
 * Calls back once for every new camera frame, not for every screen
 * refresh. requestVideoFrameCallback does exactly that where the browser
 * has it. Elsewhere, or if it stays silent, a requestAnimationFrame loop
 * watches the video's clock instead. This runs apart from any game's
 * render loop, so a busy game never makes tracking skip frames.
 */
export class VideoFrameLoop {
  private running = false;
  private handle = 0;
  private polling = false;
  private lastTime = -1;
  private lastFrameAt = 0;
  private watchdog: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly onFrame: (now: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameAt = performance.now();
    this.polling = typeof this.video.requestVideoFrameCallback !== "function";
    this.schedule();
    this.watchdog = setInterval(() => {
      if (!this.polling && this.video.readyState >= 2 && performance.now() - this.lastFrameAt > WATCHDOG_MS) {
        this.cancel();
        this.polling = true;
        this.schedule();
      }
    }, WATCHDOG_MS);
  }

  stop(): void {
    this.running = false;
    this.cancel();
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
  }

  private schedule(): void {
    if (!this.running) return;
    if (this.polling) this.handle = requestAnimationFrame((now) => this.poll(now));
    else this.handle = this.video.requestVideoFrameCallback((now) => this.frame(now));
  }

  private cancel(): void {
    if (this.polling) cancelAnimationFrame(this.handle);
    else this.video.cancelVideoFrameCallback?.(this.handle);
  }

  private frame(now: number): void {
    this.lastFrameAt = performance.now();
    this.run(now);
    this.schedule();
  }

  private poll(now: number): void {
    const time = this.video.currentTime;
    if (this.video.readyState >= 2 && time !== this.lastTime) {
      this.lastTime = time;
      this.lastFrameAt = now;
      this.run(now);
    }
    this.schedule();
  }

  private run(now: number): void {
    try {
      this.onFrame(now);
    } catch (error) {
      console.error("Camera frame failed", error);
    }
  }
}
