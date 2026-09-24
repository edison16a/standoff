import type { FencerFrame } from "@/games/fencing/engine/frames";
import { Animator } from "@/games/fencing/rig/animator";
import { drawFencer } from "@/games/fencing/rig/draw-fencer";
import { bladeTip, solve } from "@/games/fencing/rig/skeleton";
import { SKINS } from "@/games/fencing/rig/skins";
import type { CharacterId } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";
import { BladeTrail } from "./blade-trail";
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
  private readonly trail = new BladeTrail();
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d");
  }

  /**
   * `sword` is the live phone reading during calibration. When it is
   * given, the blade leaves the same fading trail it does on the strip.
   */
  draw(characterId: CharacterId, slot: Slot, timeMs: number, sword?: SwordAngles): void {
    const { ctx, canvas } = this;
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
    if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);

    const frame: FencerFrame = {
      slot, characterId, x: 0, facing: 1, ...(sword ?? LEVEL), speed: 0, action: "idle", actionMs: 0, parrying: false,
    };
    const palette = readPalette();
    const scale = height / 2.25;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width * 0.36, height * 0.93);
    ctx.scale(scale, -scale);
    const joints = solve(this.animator.pose(frame, timeMs));
    drawFencer(makeBrush(ctx, palette, slot, 1 / scale), SKINS[characterId], joints, frame);
    if (sword) {
      const tip = bladeTip(joints, SKINS[characterId].bladeLength);
      this.trail.add(tip.x, tip.y, timeMs);
      this.trail.draw(ctx, slot === 1 ? palette.accent : palette.text, timeMs, 1 / scale);
    }
    ctx.restore();
  }
}
