import type { CameraProblem } from "../device/camera-errors";
import type { CameraDevice } from "../device/webcam";
import type { ModelVariant } from "../model/model-files";
import type { Delegate } from "../model/pose-model";

export interface CameraStatus {
  state: "idle" | "opening" | "live" | "problem";
  problem: CameraProblem | null;
  /** Every camera on this computer. More than one means the player can choose. */
  devices: CameraDevice[];
  deviceId: string | null;
  label: string | null;
  /** The live picture, for previews. Null until the camera is on. */
  stream: MediaStream | null;
  width: number;
  height: number;
}

export interface ModelStatus {
  state: "idle" | "downloading" | "starting" | "ready" | "problem";
  loaded: number;
  total: number;
  variant: ModelVariant;
  delegate: Delegate | null;
  fromCache: boolean;
  error: string | null;
}

/** What the kit is doing, for React. It changes a few times a second at most, never per frame. */
export interface KitStatus {
  camera: CameraStatus;
  model: ModelStatus;
  /** Frames tracked per second and the model's mean time per frame, updated each second. */
  fps: number;
  inferenceMs: number;
  /** Which players are in view, player one first. */
  present: boolean[];
  /** Test mode: no camera and no model, poses come only from the test hooks. */
  fake: boolean;
  /** The camera is on and the model is running. */
  ready: boolean;
}

export function initialStatus(players: number, variant: ModelVariant, fake: boolean): KitStatus {
  return {
    camera: { state: "idle", problem: null, devices: [], deviceId: null, label: null, stream: null, width: 1280, height: 720 },
    model: { state: "idle", loaded: 0, total: 0, variant, delegate: null, fromCache: false, error: null },
    fps: 0,
    inferenceMs: 0,
    present: Array.from({ length: players }, () => false),
    fake,
    ready: false,
  };
}

/** A tiny store in the useSyncExternalStore shape. Each change makes a new snapshot object. */
export class StatusStore {
  private listeners = new Set<() => void>();

  constructor(private snapshot: KitStatus) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): KitStatus => this.snapshot;

  camera(patch: Partial<CameraStatus>): void {
    this.set({ camera: { ...this.snapshot.camera, ...patch } });
  }

  model(patch: Partial<ModelStatus>): void {
    this.set({ model: { ...this.snapshot.model, ...patch } });
  }

  set(patch: Partial<KitStatus>): void {
    const next = { ...this.snapshot, ...patch };
    next.ready = next.camera.state === "live" && next.model.state === "ready";
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}
