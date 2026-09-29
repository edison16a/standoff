import type { V2 } from "../engine/vec";

/** A phone's stick: x right and y up on the phone, each -1 to 1. */
export interface Stick {
  x: number;
  y: number;
}

/**
 * Turns a phone's stick into a direction on the field for the camera the
 * big screen shows. `forward` is the way up the screen on the ground, a
 * unit vector in field space. Pushing up runs that way and pushing right
 * runs to the right of the picture, so the controls follow the camera
 * when it turns round after a turnover.
 */
export function stickToField(stick: Stick, forward: V2): V2 {
  // The camera's right on the ground: forward turned a quarter clockwise, seen from above.
  const right = { x: -forward.z, z: forward.x };
  return { x: stick.y * forward.x + stick.x * right.x, z: stick.y * forward.z + stick.x * right.z };
}

/** The way up the screen before the renderer has said: down the field toward +x. */
export const DEFAULT_FORWARD: V2 = { x: 1, z: 0 };
