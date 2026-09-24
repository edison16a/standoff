import { capsule, paintGroup, type Brush, type Part } from "../brush";
import type { Vec2 } from "../geometry";
import type { Skin } from "../skins/skin";

/**
 * Arms and legs. Each limb is built as a list of parts and painted as one
 * group, so it gets a single clean outline instead of a ring at every joint.
 */

export function armParts(skin: Skin, shoulder: Vec2, elbow: Vec2, hand: Vec2): Part[] {
  const { arm } = skin.build;
  return [
    { tone: skin.tones.sleeve, build: (ctx) => capsule(ctx, shoulder, elbow, arm, arm * 0.86) },
    { tone: skin.tones.sleeve, build: (ctx) => capsule(ctx, elbow, hand, arm * 0.84, arm * 0.66) },
  ];
}

export function gloveParts(skin: Skin, hand: Vec2): Part[] {
  const r = skin.build.arm * 0.95;
  return [{ tone: skin.tones.glove, build: (ctx) => ctx.arc(hand.x, hand.y, r, 0, Math.PI * 2) }];
}

/** The free arm, drawn behind the body with its glove as one group. */
export function drawBackArm(brush: Brush, skin: Skin, shoulder: Vec2, elbow: Vec2, hand: Vec2): void {
  paintGroup(brush, [...armParts(skin, shoulder, elbow, hand), ...gloveParts(skin, hand)]);
}

/**
 * A leg: thigh in breeches, shin in the sock colour, and a shoe pointing
 * toward the opponent. The back foot turns out a little, like a real en
 * garde, which in a side view just means a shorter shoe.
 */
export function drawLeg(brush: Brush, skin: Skin, hip: Vec2, knee: Vec2, ankle: Vec2, isBack: boolean): void {
  const { leg } = skin.build;
  const toe = isBack ? 0.15 : 0.21;
  paintGroup(brush, [
    { tone: skin.tones.socks, build: (ctx) => capsule(ctx, knee, ankle, leg * 0.74, leg * 0.5) },
    { tone: skin.tones.legs, build: (ctx) => capsule(ctx, hip, knee, leg, leg * 0.78) },
    {
      tone: skin.tones.shoes,
      build: (ctx) => {
        ctx.moveTo(ankle.x - 0.055, ankle.y + 0.03);
        ctx.lineTo(ankle.x - 0.07, ankle.y - 0.07);
        ctx.lineTo(ankle.x + toe, ankle.y - 0.07);
        ctx.quadraticCurveTo(ankle.x + toe + 0.015, ankle.y - 0.015, ankle.x + toe * 0.4, ankle.y + 0.01);
        ctx.closePath();
      },
    },
  ]);
}
