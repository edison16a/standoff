import type { CharacterId } from "../roster";
import { createFighter, type Difficulty, type Fighter, type TeamId } from "./fighter";
import type { GunId } from "./guns";

/** A fighter standing at a point, for tests. */
export function fighterAt(id: number, team: TeamId, x: number, z: number, gun: GunId = "rifle", difficulty: Difficulty = "normal"): Fighter {
  const characters: CharacterId[] = ["pro", "operator", "runner", "heavy"];
  const f = createFighter(id, { team, seat: null, name: `F${id}`, character: characters[id % 4]!, gun, difficulty });
  f.pos = { x, z };
  return f;
}

/** The yaw and pitch from one point to another. */
export function angles(from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): { yaw: number; pitch: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(to.y - from.y, Math.hypot(dx, dz)) };
}
