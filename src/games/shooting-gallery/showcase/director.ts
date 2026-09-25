import { Rng } from "../engine/rng";
import { GalleryRenderer } from "../render/gallery-renderer";
import type { ShowcasePlan } from "./shots";
import { ShowcaseStage } from "./stage";

/** The game advances in steps this long, whatever the frame rate, so every run plays out the same. */
const STEP_S = 1 / 60;
/** The clip is filmed at this rate, so drawing more often only slows a capture on a slow machine. */
const FRAME_S = 1 / 30;
/**
 * Page frames come every 16 ms, so two in a row are 32 ms apart, a little
 * under a filmed frame. Waiting a full 1/30 s would skip every third one.
 */
const DRAW_EVERY_S = FRAME_S * 0.9;

/**
 * Runs the showcase: the game's own renderer drawing a round the
 * computer plays, on a clock that starts at the first frame. Stills hold
 * on their moment. The loop plays on and the camera follows its plan.
 */
export class ShowcaseDirector {
  private readonly stage: ShowcaseStage;
  private readonly renderer: GalleryRenderer;
  private firstMs: number | null = null;
  private steps = 0;
  /** Set when the canvas was resized and must be drawn again whatever the clock says. */
  private stale = true;
  private drawnAt = -Infinity;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly plan: ShowcasePlan,
  ) {
    this.stage = new ShowcaseStage(plan);
    const rng = new Rng(plan.seed * 31 + 7);
    this.renderer = new GalleryRenderer(canvas, this.stage, { random: () => rng.next(), adaptive: false });
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
    this.stale = true;
  }

  /** One animation frame. */
  frame(nowMs: number): void {
    this.firstMs ??= nowMs;
    const t = this.plan.hold ? 0 : (nowMs - this.firstMs) / 1000;
    this.seek(this.plan.start + t);
    // Software drawing can take seconds a frame. A still never changes, and the loop
    // is filmed at 30 frames a second, so the frames in between are skipped.
    const due = !this.plan.hold && t - this.drawnAt >= DRAW_EVERY_S;
    if (!due && !this.stale) return;
    this.aim(t);
    this.renderer.draw();
    this.drawnAt = t;
    this.stale = false;
  }

  dispose(): void {
    this.renderer.dispose();
  }

  /** Plays the round forward to `time` in fixed steps, drawing nothing on the way. */
  private seek(time: number): void {
    const target = Math.round(time / STEP_S);
    while (this.steps < target) {
      this.steps++;
      this.renderer.update(this.steps * STEP_S * 1000);
    }
  }

  private aim(t: number): void {
    const shot = this.plan.camera(t);
    const camera = this.stage.camera.camera;
    camera.position.set(...shot.position);
    camera.fov = shot.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(...shot.lookAt);
  }
}
