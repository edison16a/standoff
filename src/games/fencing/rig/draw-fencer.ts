import type { FencerFrame } from "@/games/fencing/engine/frames";
import { at, line, paintGroup, type Brush } from "./brush";
import { v2 } from "./geometry";
import { drawBlade } from "./pieces/blades";
import { drawHead } from "./pieces/heads";
import { armParts, drawBackArm, drawLeg, gloveParts } from "./pieces/limbs";
import { drawTorso, drawTorsoBack, drawTorsoFront } from "./pieces/torsos";
import { bladeTip, type Joints } from "./skeleton";
import type { Skin } from "./skins/skin";

/** Heads are drawn a little large, which reads better at strip distance. */
const HEAD_SCALE = 1.18;

/**
 * Hangs every art piece on its joint, back to front. The canvas is
 * expected to already be in fencer space: origin on the floor under the
 * hips, one unit per metre, y up, and mirrored for the fencer on the right.
 */
export function drawFencer(brush: Brush, skin: Skin, joints: Joints, frame: FencerFrame): void {
  const { ctx } = brush;
  const sway = Math.max(-0.08, Math.min(0.08, frame.speed * 0.04));
  const torsoTilt = joints.torsoAngle - Math.PI / 2;

  drawBackArm(brush, skin, joints.backShoulder, joints.backElbow, joints.backHand);
  at(ctx, joints.hips, torsoTilt, () => drawTorsoBack(brush, skin, sway));
  drawLeg(brush, skin, joints.hips, joints.backKnee, joints.backAnkle, true);
  at(ctx, joints.hips, torsoTilt, () => drawTorso(brush, skin));
  drawLeg(brush, skin, joints.hips, joints.frontKnee, joints.frontAnkle, false);
  at(ctx, joints.head, joints.headAngle - Math.PI / 2, () => {
    ctx.scale(HEAD_SCALE, HEAD_SCALE);
    drawHead(brush, skin);
  });
  at(ctx, joints.hips, torsoTilt, () => drawTorsoFront(brush, skin));
  drawSwordArm(brush, skin, joints, frame.parrying);
}

/** The sword goes in before the glove so the fist wraps the grip. */
function drawSwordArm(brush: Brush, skin: Skin, joints: Joints, parrying: boolean): void {
  const { ctx } = brush;
  const tip = bladeTip(joints, skin.bladeLength);
  const angle = Math.atan2(tip.y - joints.hand.y, tip.x - joints.hand.x);
  const length = Math.hypot(tip.x - joints.hand.x, tip.y - joints.hand.y);

  paintGroup(brush, armParts(skin, joints.shoulder, joints.elbow, joints.hand));
  at(ctx, joints.hand, angle, () => {
    drawBlade(brush, skin, length, joints.wrist);
    // An open parry window shows as a stripe of the player colour on the blade.
    if (parrying) line(brush, "trim", 3, [v2(0.08, 0), v2(length * 0.92, 0)]);
  });
  paintGroup(brush, gloveParts(skin, joints.hand));
}
