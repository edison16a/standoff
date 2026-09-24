import type { GameEvent } from "@/game/events";
import type { SceneFrame } from "@/game/frames";
import { Animator } from "@/rig/animator";
import { drawFencer } from "@/rig/draw-fencer";
import { solve } from "@/rig/skeleton";
import { SKINS } from "@/rig/skins";
import { Camera } from "./camera";
import { Flash } from "./flash";
import { makeBrush, readPalette, type Palette } from "./palette";
import { drawPiste } from "./piste";

/**
 * Draws a scene frame onto a canvas. Live play and replays both come
 * through here, the only difference being where the frame came from.
 * Each renderer owns its own animators and camera, so a replay renderer
 * never disturbs the live one's springs.
 */
export class SceneRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera();
  private readonly animators = { 1: new Animator(), 2: new Animator() };
  private readonly flash = new Flash();
  private palette: Palette;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available in this browser.");
    this.ctx = ctx;
    this.palette = readPalette();
  }

  /** Re-reads theme colours, called when light or dark mode flips. */
  refreshPalette(): void {
    this.palette = readPalette();
  }

  /** Matches the backing store to the element's size and the screen density. */
  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.camera.resize(cssWidth, cssHeight);
  }

  react(event: GameEvent): void {
    this.flash.react(event);
  }

  render(frame: SceneFrame): void {
    const { ctx, camera, palette } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, camera.width, camera.height);

    camera.follow(frame);
    drawPiste(ctx, camera, palette);

    const scale = camera.pixelsPerMetre;
    for (const fencer of frame.fencers) {
      const pose = this.animators[fencer.slot].pose(fencer, frame.t);
      ctx.save();
      ctx.translate(camera.toScreenX(fencer.x), camera.floorY);
      ctx.scale(scale * fencer.facing, -scale);
      drawFencer(makeBrush(ctx, palette, fencer.slot, 1 / scale), SKINS[fencer.characterId], solve(pose), fencer);
      ctx.restore();
    }
    this.flash.draw(ctx, palette, frame.t, camera.width, camera.height);
  }
}
