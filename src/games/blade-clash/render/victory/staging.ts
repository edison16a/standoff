import type { OrbitShot } from "@/games/kit/victory";
import type { Slot } from "@/games/blade-clash/players";

/**
 * A fighter's place in the ceremony: metres along the fighting line (x)
 * and across it (z), and their turn about the vertical as the model's
 * root takes it, 0 facing along +x.
 */
export interface Placement {
  x: number;
  z: number;
  yaw: number;
}

export interface Staging {
  winner: Placement;
  loser: Placement;
  /** The circling camera's first angle, in the kit's terms: round +y from +z. */
  startAngle: number;
}

/** How far from the champion the loser kneels, back on their own side of the line. */
const APART = 2.4;
/** The champion turns this far off the line, so the loser shows beside them rather than hidden behind. */
const OFF_LINE = 0.7;

/**
 * The circling shot, round the champion at the middle of the dais. It
 * stands back far enough that the sword held high stays under the names
 * across the top, and swings only a little either way so the kneeling
 * loser never hides behind the champion. The centre's height is the
 * dais's, added by the ceremony.
 */
export const SHOT: Omit<OrbitShot, "centre" | "startAngle"> = {
  radius: 8.2,
  height: 1.8,
  lookHeight: 2.5,
  speed: 0.1,
  arc: 0.42,
  introS: 2.6,
  pullBack: 1.5,
  rise: 1.8,
  bob: 0.15,
};

/** The yaw that turns a model's +x toward the direction (dx, dz). */
export function yawToward(dx: number, dz: number): number {
  return Math.atan2(-dz, dx);
}

/**
 * Where both fighters go for the ceremony. The champion stands in the
 * middle of the dais and the loser kneels on their own side, facing the
 * champion, who turns away from them toward the camera and a little off
 * the line.
 */
export function stageCeremony(winner: Slot): Staging {
  // Player one starts on the -x side and player two on +x.
  const side = winner === 1 ? 1 : -1;
  const toward = yawToward(-side, 0);
  const yaw = toward + OFF_LINE;
  return {
    winner: { x: 0, z: 0, yaw },
    loser: { x: side * APART, z: 0, yaw: toward },
    // A model facing yaw is seen from the front from this kit angle.
    startAngle: yaw + Math.PI / 2,
  };
}
