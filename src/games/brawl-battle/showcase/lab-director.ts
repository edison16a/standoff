import { stepMatch } from "../engine/match";
import { STEP } from "../engine/tuning";
import { BrawlRenderer } from "../render/brawl-renderer";
import type { FixedShot } from "../render/camera/frame-camera";
import type { Lab } from "./lab";

/** The moment a lab still holds, seconds from the match's start, and its camera. */
export interface LabStill {
  at: number;
  cam?: FixedShot;
}

/** `?at=seconds&cam=x,y,distance[,yaw,lift,fov]` from the address, for the move lab. */
export function stillFromParams(params: URLSearchParams): LabStill {
  const at = Number(params.get("at")) || 1;
  const cam = params.get("cam");
  if (!cam) return { at };
  const [x = 0, y = 0, distance = 20, yaw, lift, fov] = cam.split(",").map(Number);
  return { at, cam: { x, y, distance, yaw, lift, fov } };
}

/**
 * Shows the move lab (see lab.ts), or the icon's staged cover (see
 * cover.ts), as a still: the match played on to `still.at` and framed
 * by `still.cam`. `window.__brawlFilm(seconds)` moves the still on by
 * that much and draws it, so a script can take a frame every 1/30 of a
 * second, and `window.__brawlLab` lists when each move starts.
 */
export class LabDirector {
  private readonly renderer: BrawlRenderer;
  private carry = 0;
  private drawn = false;

  constructor(canvas: HTMLCanvasElement, private readonly lab: Lab, still: LabStill) {
    this.renderer = new BrawlRenderer(canvas);
    this.renderer.setMatch(lab.match);
    for (let t = 0; t < still.at; t += STEP) this.renderer.render(this.advance(STEP), 1, false);
    if (still.cam) {
      this.renderer.cam.fixed = still.cam;
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
