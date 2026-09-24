import type { Body } from "../engine/body";
import type { Baseline } from "../engine/calibration";
import type { MoveEvent, MoveState } from "../engine/gestures/moves";
import type { MoveTuning } from "../engine/gestures/options";
import type { Pose } from "../engine/landmarks";
import { spotsFor, type Spot } from "../engine/spots";
import { PoseTracker, type TrackFrame } from "../engine/tracker";
import type { ModelVariant } from "../model/model-files";
import type { Delegate } from "../model/pose-model";
import { CameraSource } from "./camera-source";
import { initialStatus, StatusStore, type KitStatus } from "./kit-status";
import { ModelRunner } from "./model-runner";
import { installTestHooks, wantsFakeCamera } from "./test-hooks";

export interface CameraKitOptions {
  /** Players in front of the camera, 1 or 2. Player one stands on the left of the picture. */
  players: number;
  /** "auto" (the default) runs the full model and drops to lite when this machine is too slow. */
  model?: "auto" | ModelVariant;
  delegate?: Delegate;
  /** Thresholds for any move, for example `{ lane: { lanes: 5 } }`. */
  moves?: MoveTuning;
  /** No camera and no model: poses come only from the test hooks. Off unless a test asks for it. */
  fake?: boolean;
}

/** In fake mode poses are injected at this rate, like a camera. */
const FAKE_FRAME_MS = 1000 / 30;

/**
 * Everything a camera game needs from the computer's webcam: the camera,
 * the pose model, and every player's body and moves, frame by frame. Make
 * one per room, call `start()` from the lobby, and `dispose()` at the end.
 * Nothing from the camera ever leaves this computer.
 */
export class CameraKit {
  readonly players: number;
  readonly spots: Spot[];
  private readonly store: StatusStore;
  private readonly tracker: PoseTracker;
  private readonly source: CameraSource | null;
  private readonly runner: ModelRunner | null;
  private frame: TrackFrame;
  private readonly frameListeners = new Set<(frame: TrackFrame) => void>();
  private readonly moveListeners = new Set<(event: MoveEvent) => void>();
  private overrides: ((time: number) => ReadonlyMap<number, Pose | null> | null) | null = null;
  private fakeTimer: ReturnType<typeof setInterval> | null = null;
  private removeHooks: () => void = () => undefined;
  private starting: Promise<void> | null = null;

  constructor(options: CameraKitOptions) {
    this.players = Math.max(1, Math.min(2, Math.round(options.players)));
    this.spots = spotsFor(this.players);
    const fake = options.fake ?? wantsFakeCamera();
    this.store = new StatusStore(initialStatus(this.players, options.model === "lite" ? "lite" : "full", fake));
    this.tracker = new PoseTracker({ slots: this.players, moves: options.moves });
    this.frame = { time: 0, aspect: 16 / 9, bodies: this.tracker.latest(), moves: [], events: [] };
    const onPoses = (poses: Pose[], time: number) => this.process(poses, time);
    this.runner = fake ? null : new ModelRunner(this.store, { model: options.model ?? "auto", delegate: options.delegate ?? "GPU" }, onPoses);
    this.source = fake ? null : new CameraSource(this.store, (video) => this.runner?.attach(video));
    if (process.env.NODE_ENV !== "production") this.removeHooks = installTestHooks(this);
  }

  /** For useSyncExternalStore. The snapshot changes a few times a second at most. */
  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);
  getSnapshot = (): KitStatus => this.store.getSnapshot();

  /**
   * Turns the camera on and gets the model ready, both at once. Calling it
   * again while it runs waits for the same start. After a problem, it retries.
   */
  start(): Promise<void> {
    if (!this.source || !this.runner) {
      this.startFake();
      return Promise.resolve();
    }
    const [source, runner] = [this.source, this.runner];
    this.starting ??= Promise.all([this.getSnapshot().camera.state === "live" || source.open(), runner.load()])
      .then(() => undefined)
      .finally(() => (this.starting = null));
    return this.starting;
  }

  /** Switches to another camera, from `getSnapshot().camera.devices`. */
  async chooseCamera(deviceId: string): Promise<void> {
    await this.source?.open(deviceId);
  }

  /** The latest tracked frame. Games read it from their own render loop. */
  latest(): TrackFrame {
    return this.frame;
  }

  /** A player's body now, or null when they are out of view. Slots start at 1. */
  body(slot: number): Body | null {
    return this.frame.bodies[slot - 1] ?? null;
  }

  /** A player's moves now: lane, jumping, ducking, lean and guard. */
  moves(slot: number): MoveState | null {
    return this.frame.moves[slot - 1] ?? null;
  }

  /** Every tracked frame, as it happens. Returns the unsubscribe. */
  onFrame(listener: (frame: TrackFrame) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  /** Every move as it happens: jumps, ducks, lane changes, punches, and players coming and going. */
  onMove(listener: (event: MoveEvent) => void): () => void {
    this.moveListeners.add(listener);
    return () => this.moveListeners.delete(listener);
  }

  setBaseline(slot: number, baseline: Baseline | null): void {
    this.tracker.setBaseline(slot, baseline);
  }

  baseline(slot: number): Baseline | null {
    return this.tracker.baseline(slot);
  }

  /** Changes move thresholds for every player, for example a game's difficulty setting. */
  tune(tuning: MoveTuning): void {
    this.tracker.configure(tuning);
  }

  /** Test hooks only: poses to use in place of what the camera sees. */
  setOverrides(source: ((time: number) => ReadonlyMap<number, Pose | null> | null) | null): void {
    this.overrides = source;
  }

  dispose(): void {
    this.removeHooks();
    if (this.fakeTimer) clearInterval(this.fakeTimer);
    this.fakeTimer = null;
    this.source?.dispose();
    this.runner?.dispose();
    this.frameListeners.clear();
    this.moveListeners.clear();
  }

  private startFake(): void {
    this.store.camera({ state: "live", label: "Test camera", problem: null });
    this.store.model({ state: "ready", loaded: 1, total: 1, fromCache: true, delegate: "CPU" });
    this.fakeTimer ??= setInterval(() => this.process([], performance.now()), FAKE_FRAME_MS);
  }

  private process(poses: Pose[], time: number): void {
    const { width, height } = this.getSnapshot().camera;
    const overrides = this.overrides?.(time) ?? undefined;
    const frame = this.tracker.update(poses, time, width / height || 16 / 9, overrides);
    this.frame = frame;
    const present = frame.bodies.map(Boolean);
    if (present.some((seen, i) => seen !== this.getSnapshot().present[i])) this.store.set({ present });
    for (const listener of this.frameListeners) listener(frame);
    for (const event of frame.events) for (const listener of this.moveListeners) listener(event);
  }
}
