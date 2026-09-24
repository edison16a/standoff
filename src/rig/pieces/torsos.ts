import { line, paint, type Brush } from "../brush";
import { v2 } from "../geometry";
import { BONES } from "../skeleton";
import type { Skin } from "../skins/skin";

/**
 * Torso pieces, drawn with the hips at the origin, +y up the spine and +x
 * toward the opponent. Some outfits have a layer that hangs behind the
 * legs (a cape, coat tails), so each torso has a back and a front pass.
 */

const H = BONES.torso;

/** The shared body outline: flat back, chest bulging toward the opponent. */
function trunk(ctx: CanvasRenderingContext2D, depth = 1): void {
  ctx.moveTo(-0.11 * depth, -0.02);
  ctx.lineTo(0.1 * depth, -0.02);
  ctx.quadraticCurveTo(0.15 * depth, H * 0.55, 0.1 * depth, H + 0.02);
  ctx.quadraticCurveTo(0, H + 0.07, -0.1 * depth, H + 0.01);
  ctx.quadraticCurveTo(-0.14 * depth, H * 0.5, -0.11 * depth, -0.02);
  ctx.closePath();
}

export function drawTorsoBack(brush: Brush, skin: Skin, sway: number): void {
  if (skin.torso === "doublet") {
    // A short cape off the back shoulder, lagging behind when walking.
    paint(brush, skin.tones.headDetail, (ctx) => {
      ctx.moveTo(-0.08, H);
      ctx.quadraticCurveTo(-0.26 - sway, H * 0.5, -0.2 - sway * 1.5, H * 0.05);
      ctx.lineTo(-0.06, H * 0.2);
      ctx.closePath();
    });
  }
  if (skin.torso === "long-coat") {
    // Coat tails that reach to the knee and flare out behind.
    paint(brush, skin.tones.body, (ctx) => {
      ctx.moveTo(-0.11, 0.1);
      ctx.quadraticCurveTo(-0.2 - sway, -0.2, -0.26 - sway * 1.4, -0.44);
      ctx.lineTo(0.02, -0.4);
      ctx.lineTo(0.08, 0.05);
      ctx.closePath();
    });
  }
}

export function drawTorso(brush: Brush, skin: Skin): void {
  paint(brush, skin.tones.body, (ctx) => trunk(ctx, skin.torso === "plate" ? 1.08 : 1));
  switch (skin.torso) {
    case "jacket":
      // The side seam of a fencing jacket, in the player colour.
      line(brush, "trim", 3, [v2(0.0, 0.0), v2(0.015, H * 0.55), v2(0.0, H)]);
      line(brush, "outline", 1, [v2(0.03, H + 0.02), v2(0.1, H - 0.03)]);
      break;
    case "doublet":
      for (let y = 0.08; y < H; y += 0.07) {
        paint(brush, "trim", (ctx) => ctx.arc(0.11, y, 0.011, 0, Math.PI * 2));
      }
      paint(brush, "ink", (ctx) => ctx.rect(-0.12, 0.02, 0.25, 0.04));
      break;
    case "long-coat":
      line(brush, "trim", 2.4, [v2(0.1, H - 0.02), v2(0.05, H * 0.55), v2(0.09, 0.02)]);
      paint(brush, "dark", (ctx) => ctx.rect(-0.13, 0.06, 0.26, 0.035));
      break;
    case "plate":
      for (let y = 0.05; y <= 0.17; y += 0.06) line(brush, "outline", 1.2, [v2(-0.12, y), v2(0.12, y)]);
      line(brush, "trim", 3.2, [v2(-0.1, H - 0.02), v2(0.12, 0.08)]);
      break;
  }
}

/** Pieces that sit over the sword arm's shoulder, like a pauldron. */
export function drawTorsoFront(brush: Brush, skin: Skin): void {
  if (skin.torso !== "plate") return;
  paint(brush, skin.tones.sleeve, (ctx) => {
    ctx.moveTo(-0.07, H - 0.12);
    ctx.quadraticCurveTo(-0.08, H + 0.07, 0.05, H + 0.05);
    ctx.quadraticCurveTo(0.12, H + 0.02, 0.11, H - 0.12);
    ctx.closePath();
  });
  line(brush, "outline", 1.2, [v2(-0.06, H - 0.06), v2(0.1, H - 0.06)]);
}
