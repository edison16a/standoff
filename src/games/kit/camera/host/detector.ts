import { mirrorPose, type Pose } from "../engine/landmarks";
import { PaceGuard, RateMeter } from "../engine/pace";
import type { LoadedModel } from "../model/pose-model";
import { VideoFrameLoop } from "./frame-loop";

/**
 * The model runs on the page's main thread. After each frame it rests for
 * this share of the time the frame took, which caps it near two thirds of
 * the thread. A laptop that runs it in 15 ms never notices at 30 frames a
 * second. A slow machine drops frames instead of freezing the game.
 */
const REST_SHARE = 0.5;

export interface DetectorEvents {
  /** The people seen in one camera frame, mirrored, at the frame's time. */
  poses(poses: Pose[], time: number): void;
  /** Once a second: frames tracked per second and the mean time the model took. */
  rate(fps: number, inferenceMs: number): void;
  /** The model has been clearly too slow for a while. */
  slow(): void;
  /** The model threw. The kit decides whether to try the CPU or give up. */
  failed(error: unknown): void;
}

/**
 * Runs the pose model on every new frame of the camera. The model can be
 * swapped for another while running, as when the kit moves to the lite
 * model or to the CPU.
 */
export class Detector {
  private readonly loop: VideoFrameLoop;
  private pace = new PaceGuard();
  private readonly meter = new RateMeter();
  private lastStamp = 0;
  private failures = 0;
  private restUntil = 0;

  constructor(
    private readonly video: HTMLVideoElement,
    private model: LoadedModel,
    private readonly events: DetectorEvents,
  ) {
    this.loop = new VideoFrameLoop(video, (now) => this.detect(now));
  }

  get current(): LoadedModel {
    return this.model;
  }

  start(): void {
    this.loop.start();
  }

  stop(): void {
    this.loop.stop();
  }

  /** Puts another model in place between frames. Whoever loaded the old one closes it. */
  swap(model: LoadedModel): void {
    this.model = model;
    this.failures = 0;
    this.pace = new PaceGuard();
  }

  private detect(now: number): void {
    if (this.video.readyState < 2 || !this.video.videoWidth) return;
    // After a slow frame, skip camera frames for a while, so the game and the page always get their turn.
    if (performance.now() < this.restUntil) return;
    // VIDEO mode needs strictly rising timestamps in whole milliseconds.
    const stamp = Math.max(this.lastStamp + 1, Math.round(now));
    this.lastStamp = stamp;
    const started = performance.now();
    let poses: Pose[];
    try {
      const result = this.model.landmarker.detectForVideo(this.video, stamp);
      poses = result.landmarks.map((points, i) => mirrorPose(points, result.worldLandmarks[i] ?? points));
      result.close();
    } catch (error) {
      // One bad frame can happen while a camera starts. Several in a row means the model is broken.
      if (++this.failures >= 3) this.events.failed(error);
      return;
    }
    this.failures = 0;
    const took = performance.now() - started;
    this.restUntil = performance.now() + took * REST_SHARE;
    this.events.poses(poses, now);
    if (this.meter.tick(now, took)) this.events.rate(this.meter.fps, this.meter.inferenceMs);
    if (this.pace.record(took)) this.events.slow();
  }
}
