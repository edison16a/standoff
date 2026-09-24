import type { GameEvent } from "@/game/events";
import type { StageFrame } from "@/game/frames";
import { Animator } from "@/rig/animator";
import { drawFencer } from "@/rig/draw-fencer";
import { bladeTip, solve } from "@/rig/skeleton";
import { SKINS } from "@/rig/skins";
import { BladeTrail } from "./blade-trail";
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
  private readonly camera: Camera;
  private readonly animators = { 1: new Animator(), 2: new Animator() };
  private readonly trails = { 1: new BladeTrail(), 2: new BladeTrail() };
  private readonly flash = new Flash();
  private palette: Palette;
  private dpr = 1;

  /** `minSpan` lets a still picture, like the landing page, frame closer than a match. */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    minSpan?: number,
  ) {
    this.camera = new Camera(minSpan);
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

  render(frame: StageFrame): void {
    const { ctx, camera, palette } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, camera.width, camera.height);

    camera.follow(frame);
    drawPiste(ctx, camera, palette);

    const scale = camera.pixelsPerMetre;
    for (const fencer of frame.fencers) {
      const skin = SKINS[fencer.characterId];
      const joints = solve(this.animators[fencer.slot].pose(fencer, frame.t));
      const tip = bladeTip(joints, skin.bladeLength);
      this.trails[fencer.slot].add(fencer.x + tip.x * fencer.facing, tip.y, frame.t);
      ctx.save();
      ctx.translate(camera.toScreenX(fencer.x), camera.floorY);
      ctx.scale(scale * fencer.facing, -scale);
      drawFencer(makeBrush(ctx, palette, fencer.slot, 1 / scale), skin, joints, fencer);
      ctx.restore();
    }
    this.drawTrails(frame, scale);
    this.flash.draw(ctx, palette, frame.t, camera.width, camera.height);
  }

  /** Over both fencers, in strip metres. Player one in the accent, player two in the text colour. */
  private drawTrails(frame: StageFrame, scale: number): void {
    const { ctx, camera, palette } = this;
    ctx.save();
    ctx.translate(camera.toScreenX(0), camera.floorY);
    ctx.scale(scale, -scale);
    for (const fencer of frame.fencers) {
      this.trails[fencer.slot].draw(ctx, fencer.slot === 1 ? palette.accent : palette.text, frame.t, 1 / scale);
    }
    ctx.restore();
  }
}
