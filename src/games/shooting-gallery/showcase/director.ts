import { Rng } from "../engine/rng";
import { GalleryRenderer } from "../render/gallery-renderer";
import type { ShowcasePlan } from "./shots";
import { ShowcaseStage } from "./stage";

/** The game advances in steps this long, whatever the frame rate, so every run plays out the same. */
const STEP_S = 1 / 60;

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
  /** Stills only draw again when this is set, since nothing in them moves. */
  private stale = true;

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
    if (!this.plan.hold || this.stale) {
      this.aim(t);
      this.renderer.draw();
    }
    // Software drawing can take seconds a frame, so a still that has been drawn is left alone.
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
