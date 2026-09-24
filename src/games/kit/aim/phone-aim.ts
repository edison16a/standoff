import type { PhoneRoomApi } from "@/platform/games/game-api";
import { clamp } from "@/games/kit/motion/math3d";
import { subscribeOrientation } from "@/games/kit/motion/orientation";
import { cornerCalibration, pointing, quickCalibration, recenter, toScreen, type AimCalibration, type Pointing, type ScreenPoint } from "./aim-math";
import { OneEuro } from "./one-euro";
import type { AimStep } from "./protocol";

/** How the aim is being driven: the motion sensors, or a finger dragging on the phone. */
export type AimSource = "motion" | "touch";

export interface AimSnapshot {
  point: ScreenPoint;
  source: AimSource;
  calibrated: boolean;
  /** A reading has arrived, so Set can be pressed. */
  ready: boolean;
}

const SEND_MS = 1000 / 60;
const KEEPALIVE_MS = 250;
const EPSILON = 0.002;
/** Readers are told about changes at most this often, which is plenty for a phone screen. */
const NOTIFY_MS = 1000 / 30;
/** No sensor reading within this long means the phone has none, so touch takes over. */
const SENSOR_GRACE_MS = 1500;
const SPANS_KEY = "standoff:aim-spans";

/**
 * The phone side of pointing at the big screen, shared by every aiming
 * game. It turns the phone's orientation into a point on the host's
 * screen, smooths out hand shake, and streams it to the host while the
 * game asks for it. A phone without motion sensors aims by dragging
 * instead, so every game still works on any device.
 */
export class PhoneAim {
  private reading: Pointing | null = null;
  private calibration: AimCalibration | null = null;
  private corner: { center: Pointing; topLeft?: Pointing } | null = null;
  private point: ScreenPoint = { x: 0, y: 0 };
  private readonly fx = new OneEuro();
  private readonly fy = new OneEuro();
  private source: AimSource;
  private snapshot: AimSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly stopSensors: () => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSent: ScreenPoint | null = null;
  private lastSentAt = 0;
  private lastNotify = 0;

  constructor(private readonly room: PhoneRoomApi) {
    this.source = room.motion === "granted" ? "motion" : "touch";
    this.stopSensors = subscribeOrientation((q, t) => this.onReading(pointing(q), t));
    if (this.source === "motion") this.graceTimer = setTimeout(() => !this.reading && this.useTouch(), SENSOR_GRACE_MS);
    this.snapshot = this.makeSnapshot();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AimSnapshot => this.snapshot;

  get current(): ScreenPoint {
    return this.point;
  }

  /** Tells the big screen which calibration target to show for this player. */
  announce(step: AimStep): void {
    this.room.send({ kind: "aim-step", step });
  }

  /** Step one: the phone is pointed at the middle of the screen. */
  setCenter(): boolean {
    if (!this.reading) return this.source === "touch";
    this.corner = { center: this.reading };
    this.apply(quickCalibration(this.reading), false);
    return true;
  }

  /** Steps two and three: the corner targets. After the second, the spans are measured. */
  setCorner(which: "top-left" | "bottom-right"): boolean {
    if (!this.reading || !this.corner) return false;
    if (which === "top-left") this.corner.topLeft = this.reading;
    else this.apply(cornerCalibration(this.corner.center, this.corner.topLeft ?? this.corner.center, this.reading));
    return true;
  }

  /** Skips the corners, reusing the spans this phone measured last time if there are any. */
  useQuick(): void {
    if (!this.corner) return;
    const saved = loadSpans();
    this.apply(saved ? { ...saved, center: this.corner.center } : quickCalibration(this.corner.center), false);
  }

  /** Points the current aim at the middle again, keeping the spans. For drift during play. */
  recenter(): void {
    if (this.source === "touch") return this.set({ x: 0, y: 0 });
    if (this.reading && this.calibration) this.apply(recenter(this.calibration, this.reading), false);
  }

  /** Touch aiming: moves the point by a drag, in screen units. */
  nudge(dx: number, dy: number): void {
    if (this.source !== "touch") return;
    this.set({ x: clamp(this.point.x + dx, -1, 1), y: clamp(this.point.y + dy, -1, 1) });
  }

  /** Starts or stops streaming the aim to the host. Games stream only while it is drawn. */
  stream(on: boolean): void {
    if (on) this.timer ??= setInterval(() => this.tick(), SEND_MS);
    else if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** A trigger pull, sent reliably with the aim at this instant. */
  fire(): void {
    this.room.send({ kind: "aim-fire", x: this.point.x, y: this.point.y });
  }

  dispose(): void {
    this.stream(false);
    this.stopSensors();
    if (this.graceTimer) clearTimeout(this.graceTimer);
    this.listeners.clear();
  }

  private useTouch(): void {
    this.source = "touch";
    this.calibration = null;
    this.notify(true);
  }

  /** Only a full corner measurement is worth keeping for next time. */
  private apply(calibration: AimCalibration, save = true): void {
    this.calibration = calibration;
    if (save) saveSpans(calibration);
    this.fx.reset();
    this.fy.reset();
    if (this.reading) this.set(toScreen(this.reading, calibration));
    this.notify(true);
  }

  private onReading(reading: Pointing, timeMs: number): void {
    const first = this.reading === null;
    this.reading = reading;
    if (first && this.source === "touch" && this.room.motion === "granted") this.source = "motion";
    if (!this.calibration) return first ? this.notify(true) : undefined;
    const raw = toScreen(reading, this.calibration);
    this.set({ x: this.fx.filter(raw.x, timeMs), y: this.fy.filter(raw.y, timeMs) });
  }

  private set(point: ScreenPoint): void {
    this.point = point;
    this.notify(false);
  }

  private notify(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastNotify < NOTIFY_MS) return;
    this.lastNotify = now;
    this.snapshot = this.makeSnapshot();
    for (const listener of this.listeners) listener();
  }

  private makeSnapshot(): AimSnapshot {
    return {
      point: this.point,
      source: this.source,
      calibrated: this.source === "touch" || this.calibration !== null,
      ready: this.source === "touch" || this.reading !== null,
    };
  }

  private tick(): void {
    const now = performance.now();
    const last = this.lastSent;
    const moved = !last || Math.abs(last.x - this.point.x) > EPSILON || Math.abs(last.y - this.point.y) > EPSILON;
    if (!moved && now - this.lastSentAt < KEEPALIVE_MS) return;
    this.lastSent = this.point;
    this.lastSentAt = now;
    this.room.sendLossy({ kind: "aim", x: this.point.x, y: this.point.y });
  }
}

function loadSpans(): AimCalibration | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SPANS_KEY) ?? "null") as Partial<AimCalibration> | null;
    const ok = raw && [raw.left, raw.right, raw.up, raw.down].every((v) => typeof v === "number" && v > 0 && v < 1.5);
    return ok ? (raw as AimCalibration) : null;
  } catch {
    return null;
  }
}

function saveSpans(calibration: AimCalibration): void {
  try {
    localStorage.setItem(SPANS_KEY, JSON.stringify(calibration));
  } catch {
    // Without storage the corners are simply measured again next time.
  }
}
