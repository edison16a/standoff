import { capsule, paint, type Brush, type Tone } from "../brush";
import type { Vec2 } from "../geometry";
import type { Skin } from "../skins/skin";

/** An arm: upper arm, forearm and a glove at the hand. */
export function drawArm(brush: Brush, skin: Skin, shoulder: Vec2, elbow: Vec2, hand: Vec2): void {
  const { upper, lower } = skin.limb;
  paint(brush, skin.tones.sleeve, (ctx) => capsule(ctx, shoulder, elbow, upper, upper * 0.88));
  paint(brush, skin.tones.sleeve, (ctx) => capsule(ctx, elbow, hand, upper * 0.84, lower * 0.9));
  drawGlove(brush, skin.tones.glove, hand, lower * 1.15);
}

export function drawGlove(brush: Brush, tone: Tone, hand: Vec2, radius: number): void {
  paint(brush, tone, (ctx) => ctx.arc(hand.x, hand.y, radius, 0, Math.PI * 2));
}

/**
 * A leg: thigh in breeches, shin in the sock colour, and a shoe pointing
 * toward the opponent. The back foot turns out a little, like a real en
 * garde, which in a side view just means a shorter shoe.
 */
export function drawLeg(brush: Brush, skin: Skin, hip: Vec2, knee: Vec2, ankle: Vec2, isBack: boolean): void {
  const { upper, lower } = skin.limb;
  const thigh = upper * 1.25;
  paint(brush, skin.tones.legs, (ctx) => capsule(ctx, hip, knee, thigh, thigh * 0.8));
  paint(brush, skin.tones.socks, (ctx) => capsule(ctx, knee, ankle, thigh * 0.76, lower * 0.95));
  const toe = isBack ? 0.13 : 0.2;
  paint(brush, skin.tones.shoes, (ctx) => {
    ctx.moveTo(ankle.x - 0.05, ankle.y + 0.02);
    ctx.lineTo(ankle.x - 0.06, ankle.y - 0.07);
    ctx.lineTo(ankle.x + toe, ankle.y - 0.07);
    ctx.quadraticCurveTo(ankle.x + toe + 0.01, ankle.y - 0.02, ankle.x + toe * 0.45, ankle.y);
    ctx.closePath();
  });
}
