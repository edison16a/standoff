import type { V2 } from "../engine/vec";
import type { Stick } from "./steer";

/** A stick nearer the middle than this is let go. */
const HELD = 0.2;
/** The camera may pan this far (cosine of about 60 degrees) under a held stick and the stick follows it. */
const FOLLOW = 0.5;

/**
 * The way up the screen each phone's stick is read against. A stick
 * follows the camera, but the camera turns right round after a turnover:
 * read against the new view, a thumb still pushing the same way sent its
 * player back the way he came, and he turned and ran the wrong way. So
 * while a stick is held it keeps the view it was pushed in, following
 * the camera's ordinary pans but not a turn round. Letting go takes up
 * the new view.
 */
export class StickFrames {
  private readonly anchors = new Map<number, V2>();

  frame(seat: number, stick: Stick, forward: V2): V2 {
    if (Math.hypot(stick.x, stick.y) < HELD) {
      this.anchors.delete(seat);
      return forward;
    }
    const anchor = this.anchors.get(seat);
    if (!anchor) {
      this.anchors.set(seat, { x: forward.x, z: forward.z });
      return forward;
    }
    return anchor.x * forward.x + anchor.z * forward.z >= FOLLOW ? forward : anchor;
  }
}
