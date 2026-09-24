import type { Pose } from "../engine/landmarks";
import { softwareWebGl } from "../model/gpu-check";
import type { ModelVariant } from "../model/model-files";
import { loadPoseModel, type Delegate, type LoadedModel } from "../model/pose-model";
import { Detector } from "./detector";
import type { StatusStore } from "./kit-status";

export interface RunnerOptions {
  /** "auto" starts on the full model and moves to lite when this machine is too slow for it. */
  model: "auto" | ModelVariant;
  delegate: Delegate;
}

/**
 * Loads the pose model with progress, then runs it on the camera's video
 * whenever both are ready. It steps down to the lite model on a slow
 * machine, and to the CPU if the GPU breaks mid game.
 */
export class ModelRunner {
  private model: LoadedModel | null = null;
  private loading: Promise<boolean> | null = null;
  private detector: Detector | null = null;
  private video: HTMLVideoElement | null = null;
  private disposed = false;
  private readonly abort = new AbortController();

  constructor(
    private readonly store: StatusStore,
    private readonly options: RunnerOptions,
    private readonly onPoses: (poses: Pose[], time: number) => void,
  ) {}

  /** Downloads and starts the model. Safe to call again after a failure, to retry. */
  load(): Promise<boolean> {
    if (this.model) return Promise.resolve(true);
    // On software WebGL the GPU path is the slow one, so the CPU goes first.
    const delegate = this.options.delegate === "GPU" && softwareWebGl() ? "CPU" : this.options.delegate;
    this.loading ??= this.fetch(this.options.model === "lite" ? "lite" : "full", delegate, true).finally(() => (this.loading = null));
    return this.loading;
  }

  /** The camera's video, or null when the camera stops. */
  attach(video: HTMLVideoElement | null): void {
    this.video = video;
    this.detector?.stop();
    this.detector = null;
    this.run();
  }

  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    this.detector?.stop();
    this.detector = null;
    this.model?.landmarker.close();
    this.model = null;
  }

  private async fetch(variant: ModelVariant, delegate: Delegate, shown: boolean): Promise<boolean> {
    if (shown) this.store.model({ state: "downloading", error: null, variant });
    try {
      const model = await loadPoseModel({
        variant,
        delegate,
        signal: this.abort.signal,
        onProgress: (p) => shown && this.store.model({ state: p.stage === "start" ? "starting" : "downloading", loaded: p.loaded, total: p.total, fromCache: p.fromCache }),
      });
      if (this.disposed) {
        model.landmarker.close();
        return false;
      }
      this.use(model);
      return true;
    } catch (error) {
      if (this.disposed) return false;
      console.warn("Pose model failed to load", error);
      if (shown) this.store.model({ state: "problem", error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private use(model: LoadedModel): void {
    const old = this.model;
    this.model = model;
    this.store.model({ state: "ready", variant: model.variant, delegate: model.delegate, error: null });
    if (this.detector) this.detector.swap(model);
    else this.run();
    if (old && old !== model) old.landmarker.close();
  }

  private run(): void {
    if (!this.model || !this.video || this.detector) return;
    this.detector = new Detector(this.video, this.model, {
      poses: this.onPoses,
      rate: (fps, inferenceMs) => this.store.set({ fps, inferenceMs }),
      slow: () => {
        // Too slow on this machine. Step down while play goes on: the lite model first, then the CPU,
        // which beats a weak or emulated GPU on the lite model.
        if (this.options.model !== "auto" || !this.model) return;
        if (this.model.variant === "full") void this.fetch("lite", this.model.delegate, false);
        else if (this.model.delegate === "GPU") void this.fetch("lite", "CPU", false);
      },
      failed: (error) => {
        console.error("Pose model stopped working", error);
        if (this.model?.delegate === "GPU") void this.fetch(this.model.variant, "CPU", false);
        else this.store.model({ state: "problem", error: "The body tracking stopped. Reload the page to try again." });
      },
    });
    this.detector.start();
  }
}
