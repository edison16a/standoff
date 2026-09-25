import { LM, type Body } from "@/games/kit/camera";
import type { Cover, Hand } from "../engine/types";

const ELBOW: Record<Hand, number> = { left: LM.leftElbow, right: LM.rightElbow };
const SHOULDER: Record<Hand, number> = { left: LM.leftShoulder, right: LM.rightShoulder };

/**
 * Where each of the player's gloves is, as cover for their boxer. All in
 * torso lengths from the head in the mirrored picture, so any size of
 * player reads alike:
 *
 * `face`: the glove close in front of the face, arm bent.
 * `side`: the glove up beside the head on its own side, as against a hook.
 * `body`: the elbow down by the ribs and tucked in, as against a body shot.
 */
export function coverFrom(body: Body): Record<Hand, Cover> {
  return { left: handCover(body, "left"), right: handCover(body, "right") };
}

function handCover(body: Body, hand: Hand): Cover {
  const arm = body.arms[hand];
  const unit = body.scale;
  const dx = ((arm.wrist.x - body.head.x) * body.aspect) / unit;
  const dy = (arm.wrist.y - body.head.y) / unit;
  // Out to this hand's own side of the head. The player's left hand is on the left of the picture.
  const out = hand === "left" ? -dx : dx;
  const bent = fade(arm.extension, 0.88, 0.97);
  const seen = arm.visible ? 1 : 0.3;
  const high = fade(Math.abs(dy - 0.05), 0.3, 0.55);
  const face = fade(Math.abs(dx), 0.22, 0.45) * high * rise(arm.forward, 0, 0.06) * bent;
  // Up by the ear and a little out, not down by the chin: a plain guard only half covers a hook.
  const side = fade(Math.abs(out - 0.38), 0.1, 0.25) * fade(Math.abs(dy + 0.05), 0.2, 0.4) * bent;
  const elbow = body.landmarks[ELBOW[hand]]!;
  const shoulder = body.landmarks[SHOULDER[hand]]!;
  const down = rise((elbow.y - shoulder.y) / unit, 0.25, 0.5);
  const tucked = fade((Math.abs(elbow.x - body.shoulders.x) * body.aspect) / unit, 0.45, 0.7);
  return { face: face * seen, side: side * seen, body: down * tucked * bent * seen };
}

/**
 * Both arms held straight out toward the camera at shoulder height, as
 * to touch gloves. The match wants it held a moment, so a punch never
 * counts.
 */
export function reachingOut(body: Body): boolean {
  return (["left", "right"] as const).every((hand) => {
    const arm = body.arms[hand];
    const shoulder = body.landmarks[SHOULDER[hand]]!;
    const level = Math.abs(arm.wrist.y - shoulder.y) / body.scale < 0.5;
    const ahead = (Math.abs(arm.wrist.x - shoulder.x) * body.aspect) / body.scale < 0.5;
    return arm.visible && arm.extension > 0.8 && arm.forward > 0.15 && level && ahead;
  });
}

/** 1 up to `good`, 0 from `bad` on. */
function fade(value: number, good: number, bad: number): number {
  return Math.min(1, Math.max(0, (bad - value) / (bad - good)));
}

/** 0 up to `from`, 1 from `to` on. */
function rise(value: number, from: number, to: number): number {
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}
