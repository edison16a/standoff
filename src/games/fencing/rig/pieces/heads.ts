import { FACE, INK, line, paint, type Brush } from "../brush";
import { v2 } from "../geometry";
import type { Skin } from "../skins/skin";

/**
 * Head pieces, drawn around the centre of the head with +x toward the
 * opponent and +y up the neck. The caller rotates the canvas so a nod or a
 * recoil tilts the whole piece.
 */
export function drawHead(brush: Brush, skin: Skin): void {
  HEADS[skin.head](brush, skin);
}

const HEADS: Record<Skin["head"], (brush: Brush, skin: Skin) => void> = {
  "mesh-mask": meshMask,
  "plumed-hat": plumedHat,
  bandana,
  helm,
};

/** A modern fencing mask: rounded mesh front, bib underneath, strap at the back. */
function meshMask(brush: Brush, skin: Skin): void {
  paint(brush, skin.tones.body, (ctx) => {
    ctx.moveTo(-0.02, -0.1);
    ctx.quadraticCurveTo(0.08, -0.17, 0.15, -0.13);
    ctx.lineTo(0.12, -0.08);
    ctx.lineTo(-0.01, -0.06);
    ctx.closePath();
  });
  paint(brush, skin.tones.head, (ctx) => ctx.ellipse(0.02, 0.005, 0.125, 0.135, 0, 0, Math.PI * 2));
  const { ctx } = brush;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0.02, 0.005, 0.118, 0.128, 0, 0, Math.PI * 2);
  ctx.clip();
  for (let x = 0.0; x <= 0.15; x += 0.022) line(brush, skin.tones.headDetail, 0.9, [v2(x, -0.14), v2(x, 0.14)]);
  for (let y = -0.12; y <= 0.13; y += 0.022) line(brush, skin.tones.headDetail, 0.9, [v2(0, y), v2(0.16, y)]);
  ctx.restore();
}

/** Face, hair tied back, a wide brimmed hat and a trailing plume. */
function plumedHat(brush: Brush, skin: Skin): void {
  paint(brush, skin.tones.head, (ctx) => ctx.ellipse(-0.06, -0.02, 0.07, 0.09, 0.3, 0, Math.PI * 2));
  paint(brush, FACE, (ctx) => ctx.ellipse(0.02, -0.01, 0.1, 0.112, 0, 0, Math.PI * 2));
  paint(brush, INK, (ctx) => ctx.arc(0.07, 0.01, 0.012, 0, Math.PI * 2));
  paint(brush, skin.tones.headDetail, (ctx) => {
    ctx.moveTo(-0.02, 0.12);
    ctx.bezierCurveTo(-0.12, 0.26, -0.26, 0.2, -0.3, 0.06);
    ctx.bezierCurveTo(-0.22, 0.14, -0.12, 0.14, -0.04, 0.08);
    ctx.closePath();
  });
  paint(brush, skin.tones.head, (ctx) => {
    ctx.moveTo(-0.08, 0.08);
    ctx.quadraticCurveTo(-0.07, 0.2, 0.03, 0.19);
    ctx.quadraticCurveTo(0.11, 0.18, 0.1, 0.08);
    ctx.closePath();
  });
  paint(brush, skin.tones.head, (ctx) => ctx.ellipse(0.01, 0.075, 0.2, 0.03, -0.12, 0, Math.PI * 2));
}

/** Bare face, a wrapped bandana with knot tails blowing back. */
function bandana(brush: Brush, skin: Skin): void {
  paint(brush, skin.tones.head, (ctx) => ctx.ellipse(0.02, -0.01, 0.1, 0.115, 0, 0, Math.PI * 2));
  paint(brush, INK, (ctx) => ctx.arc(0.075, 0.015, 0.012, 0, Math.PI * 2));
  paint(brush, skin.tones.headDetail, (ctx) => {
    ctx.moveTo(-0.09, 0.0);
    ctx.quadraticCurveTo(-0.08, 0.13, 0.03, 0.125);
    ctx.quadraticCurveTo(0.12, 0.11, 0.12, 0.04);
    ctx.lineTo(-0.09, 0.03);
    ctx.closePath();
  });
  paint(brush, skin.tones.headDetail, (ctx) => {
    ctx.moveTo(-0.08, 0.04);
    ctx.quadraticCurveTo(-0.17, 0.02, -0.22, -0.05);
    ctx.lineTo(-0.16, -0.03);
    ctx.quadraticCurveTo(-0.2, -0.1, -0.2, -0.12);
    ctx.quadraticCurveTo(-0.12, -0.04, -0.08, 0.01);
    ctx.closePath();
  });
}

/** A great helm: flat top, a dark eye slit, breathing holes and a crest ridge. */
function helm(brush: Brush, skin: Skin): void {
  paint(brush, skin.tones.head, (ctx) => {
    ctx.moveTo(-0.1, -0.13);
    ctx.lineTo(-0.11, 0.08);
    ctx.quadraticCurveTo(-0.1, 0.145, 0.02, 0.145);
    ctx.quadraticCurveTo(0.13, 0.14, 0.135, 0.06);
    ctx.lineTo(0.14, -0.1);
    ctx.quadraticCurveTo(0.02, -0.16, -0.1, -0.13);
    ctx.closePath();
  });
  line(brush, skin.tones.headDetail, 3.2, [v2(0.03, 0.025), v2(0.14, 0.025)]);
  line(brush, "outline", 1.2, [v2(0.137, -0.1), v2(0.137, 0.1)]);
  for (let y = -0.09; y <= -0.03; y += 0.025) {
    paint(brush, skin.tones.headDetail, (ctx) => ctx.arc(0.1, y, 0.006, 0, Math.PI * 2));
  }
  line(brush, "trim", 3.4, [v2(-0.09, 0.15), v2(0.0, 0.17), v2(0.1, 0.15)]);
}
