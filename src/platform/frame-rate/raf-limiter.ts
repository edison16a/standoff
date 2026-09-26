import { FramePacer } from "./frame-pacer";

type Request = (callback: FrameRequestCallback) => number;
type Cancel = (handle: number) => void;

/** The part of window the limiter swaps out. Tests pass a fake one. */
export interface FrameHost {
  requestAnimationFrame: Request;
  cancelAnimationFrame: Cancel;
}

/**
 * Handles the limiter gives out start here, far above the browser's own,
 * so a cancel always reaches whoever issued the handle.
 */
const HANDLE_BASE = 2 ** 30;

/**
 * Holds every requestAnimationFrame loop on the page to one frame rate
 * without touching the games. It stands in for the browser's function,
 * gathers the callbacks, and runs them all together on the refreshes the
 * pacer picks, with that refresh's timestamp, just as the browser would.
 * Timers, audio and camera frame callbacks never pass through it.
 */
export class RafLimiter {
  /** The browser's own functions, for code that must see every refresh. */
  readonly native: { request: Request; cancel: Cancel };
  private queue = new Map<number, FrameRequestCallback>();
  /** The batch running right now. A cancel still stops a callback in it that has not run. */
  private running: Map<number, FrameRequestCallback> | null = null;
  private nextHandle = HANDLE_BASE;
  private pump = 0;
  private pacer: FramePacer | null = null;
  /** Callbacks passed back to the browser on uninstall, by our handle. */
  private handedOver = new Map<number, number>();

  /** What to put back on uninstall. See restore. */
  private readonly original: { request: Request; cancel: Cancel; own: boolean };

  constructor(private readonly host: FrameHost) {
    this.original = {
      request: host.requestAnimationFrame,
      cancel: host.cancelAnimationFrame,
      own: Object.prototype.hasOwnProperty.call(host, "requestAnimationFrame"),
    };
    this.native = {
      request: host.requestAnimationFrame.bind(host),
      cancel: host.cancelAnimationFrame.bind(host),
    };
  }

  /** The cap in use, or null when the browser runs frames as it likes. */
  get rate(): number | null {
    return this.pacer ? this.fps : null;
  }
  private fps = 0;

  /** Caps the page at fps. Null gives the browser's own function back. */
  setRate(fps: number | null, refreshHz?: number): void {
    if (fps === null || !(fps > 0)) return this.uninstall();
    this.fps = fps;
    if (this.pacer) return this.pacer.setRate(fps);
    this.pacer = new FramePacer(fps, refreshHz);
    this.host.requestAnimationFrame = this.request;
    this.host.cancelAnimationFrame = this.cancel;
  }

  private readonly request = (callback: FrameRequestCallback): number => {
    const handle = this.nextHandle++;
    this.queue.set(handle, callback);
    if (!this.pump) this.pump = this.native.request(this.onRefresh);
    return handle;
  };

  private readonly cancel = (handle: number): void => {
    const passed = this.handedOver.get(handle);
    if (passed !== undefined) {
      this.handedOver.delete(handle);
      this.native.cancel(passed);
      this.settleCancel();
    } else if (handle >= HANDLE_BASE) {
      this.running?.delete(handle);
      this.queue.delete(handle);
      if (this.queue.size === 0 && this.pump) {
        this.native.cancel(this.pump);
        this.pump = 0;
      }
    } else {
      this.native.cancel(handle);
    }
  };

  private readonly onRefresh = (now: number): void => {
    this.pump = 0;
    if (!this.pacer || this.pacer.tick(now)) {
      // Callbacks asked for while this batch runs wait for the next frame, as in the browser.
      const batch = this.queue;
      this.queue = new Map();
      this.running = batch;
      // Map iteration is live, so a callback deleted by a cancel mid batch is skipped.
      for (const [handle, callback] of batch) {
        batch.delete(handle);
        run(callback, now);
      }
      this.running = null;
    }
    if (this.queue.size > 0 && this.pacer && !this.pump) this.pump = this.native.request(this.onRefresh);
  };

  private uninstall(): void {
    if (!this.pacer) return;
    this.pacer = null;
    if (this.host.requestAnimationFrame === this.request) this.restore("requestAnimationFrame", this.original.request);
    if (this.pump) this.native.cancel(this.pump);
    this.pump = 0;
    // Waiting loops move to the browser in order. Their old handles must
    // still cancel them, so cancel stays wrapped until they have all run.
    const waiting = this.queue;
    this.queue = new Map();
    for (const [handle, callback] of waiting) {
      const passed = this.native.request((now) => {
        this.handedOver.delete(handle);
        this.settleCancel();
        run(callback, now);
      });
      this.handedOver.set(handle, passed);
    }
    this.settleCancel();
  }

  /** Gives the browser's cancel back once nothing handed over is left. */
  private settleCancel(): void {
    if (this.pacer || this.handedOver.size > 0) return;
    if (this.host.cancelAnimationFrame === this.cancel) this.restore("cancelAnimationFrame", this.original.cancel);
  }

  /**
   * On a real window the functions live on its prototype, so dropping our
   * own property brings back the exact original. A host that had its own
   * gets it assigned back instead.
   */
  private restore<K extends keyof FrameHost>(key: K, value: FrameHost[K]): void {
    if (this.original.own) this.host[key] = value;
    else delete (this.host as Partial<FrameHost>)[key];
  }
}

/** One loop throwing must not stop the others, and still shows up like any uncaught error. */
function run(callback: FrameRequestCallback, now: number): void {
  try {
    callback(now);
  } catch (error) {
    if (typeof reportError === "function") reportError(error);
    else console.error(error);
  }
}
