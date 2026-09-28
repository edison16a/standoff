import type { PhoneRoomApi } from "@/platform/games/game-api";
import { clamp } from "@/games/kit/motion/math3d";
import { subscribeOrientation } from "@/games/kit/motion/orientation";
import { fitCalibration, type AimSample } from "./aim-fit";
import { pointing, quickCalibration, recenter, scaleSpans, toScreen, WHOLE_SCREEN, type AimCalibration, type AimZone, type Pointing, type ScreenPoint } from "./aim-math";
import { TARGET_POINTS, type AimTarget } from "./aim-targets";
import { OneEuro } from "./one-euro";
import { loadSpans, saveSpans } from "./saved-spans";
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
  /** The readings taken at each calibration target so far. */
  private samples: AimSample[] = [];
  private point: ScreenPoint = { x: 0, y: 0 };
  /** The part of the big screen this player aims inside, for games with a view per player. */
  private zone: AimZone = WHOLE_SCREEN;
  private readonly fx = new OneEuro();
  private readonly fy = new OneEuro();
  private source: AimSource;
  private snapshot: AimSnapshot;
  private readonly listeners = new Set<() => void>();
  private readonly stopSensors: () => void;
  private readonly unlisten: () => void;
  /** The calibration target last shown for this player, sent again after a reconnect. */
  private step: AimStep | null = null;
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
    // The host forgets a phone's target when it drops, so a player mid calibration would point at nothing.
    this.unlisten = room.on((event) => event.type === "rejoined" && this.step && this.announce(this.step));
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
    this.step = step;
    this.room.send({ kind: "aim-step", step });
  }

  /**
   * For games with a view per player: the part of the big screen this
   * player calibrates and aims inside. Only saved spans need it, since the
   * aim itself always spans whatever zone the targets were shown in.
   */
  setZone(zone: AimZone | null): void {
    this.zone = zone ?? WHOLE_SCREEN;
  }

  /** The raw pointing right now, for a calibration page watching the player hold still. */
  get pointing(): Pointing | null {
    return this.reading;
  }

  /** Forgets the targets taken so far, to calibrate from the start. */
  restartCalibration(): void {
    this.samples = [];
  }

  /**
   * Takes where the phone points now as pointing at a calibration target,
   * and refits the aim to every target taken so far. The first must be
   * the middle. `last` keeps the spans for next time, once all are in.
   */
  capture(target: AimTarget, last = false): boolean {
    if (!this.reading) return this.source === "touch";
    const samples = [...this.samples, { target: TARGET_POINTS[target], reading: this.reading }];
    const fit = fitCalibration(samples);
    if (!fit) return false;
    this.samples = samples;
    const measured = samples.some((s) => s.target.x !== 0);
    // The middle alone gives default spans for the whole screen, so they are scaled down to this zone.
    this.apply(measured ? fit : scaleSpans(fit, this.zone, true), last && measured);
    return true;
  }

  /** The classic first step: the middle, starting afresh. */
  setCenter(): boolean {
    this.restartCalibration();
    return this.capture("center");
  }

  /** The classic corners. After the bottom right, the spans are kept. */
  setCorner(which: "top-left" | "bottom-right"): boolean {
    return this.samples.length > 0 && this.capture(which, which === "bottom-right");
  }

  /** Skips the targets left, reusing the spans this phone measured last time if no corner was taken yet. */
  useQuick(): void {
    // Corners already taken are better than any saved guess, so the fit so far stands.
    if (this.samples.some((s) => s.target.x !== 0)) return;
    const center = fitCalibration(this.samples.filter((s) => s.target.x === 0 && s.target.y === 0))?.center;
    if (!center) return;
    const saved = loadSpans();
    // Spans are kept as if measured across the whole screen, so they are scaled down to this zone.
    this.apply(scaleSpans(saved ? { ...saved, center } : quickCalibration(center), this.zone, true), false);
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
    this.unlisten();
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
    if (save) saveSpans(scaleSpans(calibration, this.zone));
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
