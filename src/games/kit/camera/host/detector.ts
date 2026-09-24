import { mirrorPose, type Pose } from "../engine/landmarks";
import { PaceGuard, RateMeter } from "../engine/pace";
import type { LoadedModel } from "../model/pose-model";
import { VideoFrameLoop } from "./frame-loop";

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
  private readonly pace = new PaceGuard();
  private readonly meter = new RateMeter();
  private lastStamp = 0;
  private failures = 0;

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
  }

  private detect(now: number): void {
    if (this.video.readyState < 2 || !this.video.videoWidth) return;
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
    this.events.poses(poses, now);
    if (this.meter.tick(now, took)) this.events.rate(this.meter.fps, this.meter.inferenceMs);
    if (this.pace.record(took)) this.events.slow();
  }
}
