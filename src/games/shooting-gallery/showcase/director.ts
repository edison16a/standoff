import { Rng } from "../engine/rng";
import { GalleryRenderer } from "../render/gallery-renderer";
import { STEP_S, type CameraShot, type RoundPlan } from "./shots";
import { ShowcaseStage } from "./stage";

/**
 * Runs the showcase: the game's own renderer drawing a round the
 * computer plays. `show` plays the round forward to a moment and draws
 * it from any camera. The round only runs forward, so each shot of the
 * trailer gets a director of its own.
 */
export class ShowcaseDirector {
  private readonly stage: ShowcaseStage;
  private readonly renderer: GalleryRenderer;
  private steps = 0;

  constructor(canvas: HTMLCanvasElement, round: RoundPlan) {
    this.stage = new ShowcaseStage(round);
    const rng = new Rng(round.seed * 31 + 7);
    this.renderer = new GalleryRenderer(canvas, this.stage, { random: () => rng.next(), adaptive: false, labels: false });
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
  }

  /** Plays the round on to `time` in fixed steps, then draws it from `shot`. */
  show(time: number, shot: CameraShot): void {
    const target = Math.round(time / STEP_S);
    while (this.steps < target) {
      this.steps++;
      this.renderer.update(this.steps * STEP_S * 1000);
    }
    const camera = this.stage.camera.camera;
    camera.position.set(...shot.position);
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(...shot.lookAt);
    this.renderer.draw();
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
