import type { FencerFrame } from "@/game/frames";
import { Animator } from "@/rig/animator";
import { drawFencer } from "@/rig/draw-fencer";
import { solve } from "@/rig/skeleton";
import { SKINS } from "@/rig/skins";
import type { CharacterId } from "@/shared/characters";
import type { Slot } from "@/shared/players";
import { makeBrush, readPalette } from "./palette";

export interface SwordAngles {
  pitch: number;
  yaw: number;
  roll: number;
}

const LEVEL: SwordAngles = { pitch: 0, yaw: 0, roll: 0 };

/**
 * Draws one fencer standing in guard, for the character select cards. It
 * runs the same rig and skins as the strip, so what you pick is exactly
 * what shows up in the match.
 */
export class FencerPreview {
  private readonly animator = new Animator();
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
  }

  /** `sword` is the live phone reading during calibration, level otherwise. */
  draw(characterId: CharacterId, slot: Slot, timeMs: number, sword: SwordAngles = LEVEL): void {
    const { ctx, canvas } = this;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
    if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);

    const frame: FencerFrame = {
      slot, characterId, x: 0, facing: 1, ...sword, speed: 0, action: "idle", actionMs: 0, parrying: false,
    };
    const palette = readPalette();
    const scale = height / 2.25;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width * 0.36, height * 0.93);
    ctx.scale(scale, -scale);
    const pose = this.animator.pose(frame, timeMs);
    drawFencer(makeBrush(ctx, palette, slot, 1 / scale), SKINS[characterId], solve(pose), frame);
    ctx.restore();
  }
}
