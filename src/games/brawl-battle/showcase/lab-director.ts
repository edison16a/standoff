import { stepMatch } from "../engine/match";
import { STEP } from "../engine/tuning";
import { BrawlRenderer } from "../render/brawl-renderer";
import type { Lab } from "./lab";

/**
 * Shows the move lab (see lab.ts) as a still, for reviewing animation in
 * development. `?at=seconds` holds another moment and `?cam=x,y,distance`
 * pins the camera. `window.__brawlFilm(seconds)` moves the still on by
 * that much and draws it, so a script can take a frame every 1/30 of a
 * second, and `window.__brawlLab` lists when each move starts.
 */
export class LabDirector {
  private readonly renderer: BrawlRenderer;
  private carry = 0;
  private drawn = false;

  constructor(canvas: HTMLCanvasElement, private readonly lab: Lab, params: URLSearchParams) {
    this.renderer = new BrawlRenderer(canvas);
    this.renderer.setMatch(lab.match);
    const at = Number(params.get("at")) || 1;
    for (let t = 0; t < at; t += STEP) this.renderer.render(this.advance(STEP), 1, false);
    const cam = params.get("cam");
    if (cam) {
      const [x = 0, y = 0, distance = 20] = cam.split(",").map(Number);
      this.renderer.cam.fixed = { x, y, distance };
      this.renderer.cam.update(lab.match.stage, [], 0, { snap: true });
    }
    const w = window as unknown as Record<string, unknown>;
    w.__brawlLab = lab.marks;
    w.__brawlFilm = (seconds: number) => {
      for (let t = 0; t + 1e-9 < seconds; t += STEP) this.renderer.render(this.advance(Math.min(STEP, seconds - t)), this.alpha, false);
      this.renderer.render(0, this.alpha);
      this.renderer.finish();
    };
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.resize(width, height, dpr);
    this.drawn = false;
  }

  frame(): void {
    if (this.drawn) return;
    this.renderer.render(0, this.alpha);
    this.renderer.finish();
    this.drawn = true;
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private get alpha(): number {
    return Math.min(1, this.carry / STEP);
  }

  /** Steps the lab by a slice of time and returns the time that passed. */
  private advance(dt: number): number {
    this.carry += dt;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.renderer.beforeStep();
      stepMatch(this.lab.match, new Map([[0, this.lab.command(this.lab.match)]]));
      this.renderer.afterStep();
    }
    return dt;
  }
}
