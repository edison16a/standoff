import { RIM_SPOT } from "../engine/court";
import type { Match } from "../engine/match";
import { GREEN_MS } from "../engine/shot-model";
import { dir2 } from "../engine/vec";

/**
 * Lab scenes for the defence: `swat` jumps at a jumper and gets a hand
 * on it, `charge` runs the ball handler into a set defender, and
 * `blockfoul` has a defender slide late into the handler's path. The
 * referee's call is down to the seed; each scene starts on one he sees.
 */
export const DEFENCE_SCENES = ["swat", "charge", "blockfoul"] as const;
export type DefenceScene = (typeof DEFENCE_SCENES)[number];

const SHOOTER = 0;
const LOCKDOWN = 3;
const HOLLOWAY = 5;

/** Where the six stand: the Shooter, two teammates, then the Lockdown defender, the Playmaker and the All Rounder. */
export const DEFENCE_SPOTS: Record<DefenceScene, [number, number][]> = {
  swat: [[0, 6.2], [-6, 3], [6, 3], [-5, 9], [5, 9], [0.1, 5.3]],
  charge: [[0, 9.6], [-6, 4], [6, 4], [0, 5.4], [-5.5, 10], [5.5, 10]],
  blockfoul: [[-3.2, 6.6], [-6, 3], [6, 3], [1.6, 5.4], [-5.5, 10], [5.5, 10]],
};

/** A seed the referee sees the contact on, per scene. */
export const DEFENCE_SEEDS: Record<DefenceScene, number> = { swat: 7, charge: 7, blockfoul: 1 };

/** Only the defender in the scene plays; the rest stand where they are, so nothing gets in the way. */
export function setupDefence(scene: DefenceScene, m: Match): void {
  for (const a of m.athletes) if (a.team === 1) a.auto = false;
  if (scene === "swat") m.athletes[HOLLOWAY]!.auto = true;
  // The set defender squares up to the man coming at him.
  if (scene === "charge") m.athletes[LOCKDOWN]!.yaw = 0;
}

export function steerDefence(scene: DefenceScene, m: Match, t: number, once: (key: string) => boolean): void {
  const a = m.athletes[SHOOTER]!;
  if (scene === "swat") {
    if (t > 0.4 && once("shoot")) {
      m.forcedBlock = true;
      m.press(SHOOTER, "shoot");
    }
    if (t > 0.4 + GREEN_MS / 1000 && once("release")) m.release(SHOOTER, GREEN_MS);
    if (t > 0.62 && once("block")) m.press(HOLLOWAY, "defend");
    return;
  }
  const d = m.athletes[LOCKDOWN]!;
  if (scene === "charge") {
    // Flat out at the rim, straight through the man standing in the lane.
    const to = dir2(a, RIM_SPOT);
    a.move = m.ball.holder === SHOOTER ? { x: to.x, z: to.z } : { x: 0, z: 0 };
    d.move = { x: 0, z: 0 };
    return;
  }
  // Across the top, and the defender slides in late, into the handler's path rather than ahead of it.
  a.move = m.ball.holder === SHOOTER ? { x: 1, z: -0.15 } : { x: 0, z: 0 };
  const late = t > 0.55 && m.ball.holder === SHOOTER;
  const into = dir2(d, { x: a.x + 0.4, z: a.z });
  d.move = late ? { x: into.x, z: into.z } : { x: 0, z: 0 };
}
