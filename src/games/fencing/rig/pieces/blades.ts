import { colour, INK, line, paint, type Brush } from "../brush";
import { v2 } from "../geometry";
import type { Skin } from "../skins/skin";

/**
 * Swords, drawn from the hand along +x for `length` metres. The guard sits
 * at the hand and the grip runs back behind it. `wrist` turns the guard,
 * which is the only place the phone's roll shows up on screen.
 */
export function drawBlade(brush: Brush, skin: Skin, length: number, wrist: number): void {
  const guardScale = 0.55 + 0.45 * Math.abs(Math.cos(wrist));
  paint(brush, INK, (ctx) => ctx.rect(-0.13, -0.014, 0.13, 0.028));
  BLADES[skin.blade](brush, skin, length, guardScale);
}

const BLADES: Record<Skin["blade"], (brush: Brush, skin: Skin, length: number, guard: number) => void> = {
  epee: (brush, skin, length, guard) => {
    straightBlade(brush, skin, length, 0.012, 0.004);
    paint(brush, skin.tones.blade, (ctx) => ctx.arc(length, 0, 0.008, 0, Math.PI * 2));
    paint(brush, skin.tones.guard, (ctx) => ctx.ellipse(0.02, 0, 0.022, 0.075 * guard, 0, -Math.PI / 2, Math.PI / 2));
  },
  rapier: (brush, skin, length, guard) => {
    straightBlade(brush, skin, length, 0.011, 0.002);
    line(brush, skin.tones.guard, 3, [v2(0.015, -0.1 * guard), v2(0.015, 0.1 * guard)]);
    line(brush, skin.tones.guard, 2.4, [v2(0.015, -0.03), v2(-0.06, -0.07), v2(-0.13, -0.02)]);
    brush.ctx.beginPath();
    brush.ctx.ellipse(0.05, 0, 0.035, 0.03 * guard, 0, 0, Math.PI * 2);
    brush.ctx.lineWidth = 2.4 * brush.px;
    brush.ctx.strokeStyle = colour(brush, skin.tones.guard);
    brush.ctx.stroke();
  },
  saber: (brush, skin, length, guard) => {
    paint(brush, skin.tones.blade, (ctx) => {
      ctx.moveTo(0.02, -0.014);
      ctx.quadraticCurveTo(length * 0.6, -0.02, length, 0.05);
      ctx.quadraticCurveTo(length * 0.6, 0.02, 0.02, 0.016);
      ctx.closePath();
    });
    paint(brush, skin.tones.guard, (ctx) => {
      ctx.moveTo(0.03, 0.04 * guard);
      ctx.quadraticCurveTo(-0.07, -0.09 * guard, -0.14, -0.02);
      ctx.lineTo(-0.12, -0.01);
      ctx.quadraticCurveTo(-0.06, -0.06 * guard, 0.01, 0.03 * guard);
      ctx.closePath();
    });
  },
  arming: (brush, skin, length, guard) => {
    straightBlade(brush, skin, length, 0.024, 0.006);
    line(brush, "outline", 1, [v2(0.05, 0), v2(length * 0.7, 0)]);
    paint(brush, skin.tones.guard, (ctx) => ctx.rect(0.0, -0.11 * guard, 0.028, 0.22 * guard));
    paint(brush, skin.tones.guard, (ctx) => ctx.arc(-0.14, 0, 0.022, 0, Math.PI * 2));
  },
};

/** A straight tapered blade with a pointed tip. */
function straightBlade(brush: Brush, skin: Skin, length: number, base: number, tip: number): void {
  paint(brush, skin.tones.blade, (ctx) => {
    ctx.moveTo(0.02, -base);
    ctx.lineTo(length - 0.02, -tip);
    ctx.lineTo(length, 0);
    ctx.lineTo(length - 0.02, tip);
    ctx.lineTo(0.02, base);
    ctx.closePath();
  });
}
