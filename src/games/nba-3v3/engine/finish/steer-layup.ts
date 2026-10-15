import type { LayupKind } from "../types";
import type { V2 } from "../vec";
import type { Approach } from "./approach";

/**
 * A person laying it up picks the layup with the stick, held as Shoot is
 * held. The direction is read against the line to the rim:
 *
 * - Let go of the stick with a man in front: a juke, a pump fake and a
 *   jab step round him. Nobody there: the game picks, as for a bot.
 * - At the rim, within 20 degrees: straight on (a finger roll, off the
 *   glass from the wing, or a power layup when slow).
 * - From the wing or the baseline, past the rim toward the baseline on
 *   the far side: a reverse under the backboard.
 * - Off to a side, 20 to 60 degrees: a euro step that way.
 * - Across, 60 to 115 degrees: a step through under the rim to that side.
 * - Pulled back, past 115 degrees: a hop step.
 */

export interface Steered {
  layup: LayupKind;
  /** + the driver's right facing the rim. */
  side: 1 | -1;
  /** For a reverse: the side of the rim along x it goes up on. */
  cross?: 1 | -1;
}

/** Where the driver is against the rim: the way to it, and how far off its middle along x. */
export interface SteerFrame {
  toRim: V2;
  off: number;
}

export const STEER = {
  /** A stick pushed less than this is let go. */
  dead: 0.35,
  /** A man nearer than this, not behind, is there to juke. */
  jukeRange: 2.2,
  /** Band edges, in degrees off the line to the rim. */
  straight: 20,
  euro: 60,
  through: 115,
  /** A reverse needs the stick this far toward the baseline, from at least this far off the middle. */
  baseline: 0.5,
  wing: 0.6,
} as const;

const DEG = 180 / Math.PI;

export function steerLayup(ap: Approach, stick: V2 | null, frame: SteerFrame, natural: 1 | -1): Steered | null {
  const len = stick ? Math.hypot(stick.x, stick.z) : 0;
  const t = ap.threat;
  if (!stick || len < STEER.dead) {
    if (t && t.spot !== "trail" && t.dist < STEER.jukeRange) return { layup: "juke", side: t.lateral > 0 ? -1 : 1 };
    return null;
  }
  const s = { x: stick.x / len, z: stick.z / len };
  const f = frame.toRim;
  // The driver's right, facing the rim, is (-f.z, f.x).
  const ahead = s.x * f.x + s.z * f.z;
  const right = -s.x * f.z + s.z * f.x;
  const angle = Math.acos(Math.max(-1, Math.min(1, ahead))) * DEG;
  const side: 1 | -1 = right >= 0 ? 1 : -1;
  if (angle <= STEER.straight) return { layup: straightOn(ap), side: natural };
  if (ap.angle !== "front" && Math.abs(frame.off) > STEER.wing && -s.z > STEER.baseline && Math.sign(s.x) === -Math.sign(frame.off)) {
    return { layup: "reverse", side, cross: s.x > 0 ? 1 : -1 };
  }
  if (angle <= STEER.euro) return { layup: "euro", side };
  if (angle <= STEER.through) return { layup: "stepThrough", side };
  return { layup: "hop", side: t ? (t.lateral > 0 ? -1 : 1) : side };
}

/** Straight at the rim: off the glass from the wing, a power layup when slow or off a board, else a finger roll. */
function straightOn(ap: Approach): LayupKind {
  if (ap.putback || ap.speed < 2.4) return "power";
  return ap.angle === "side" ? "glass" : "finger";
}
