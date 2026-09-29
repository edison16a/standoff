import type { Match } from "../engine/match";

/**
 * When the camera goes behind the free throw shooter: once the players
 * start the walk to the line (the whistle belongs to the referee on the
 * broadcast view), through every shot, and on the last one until the
 * ball comes off the rim and the rebound is fought for.
 */
export function freeThrowShot(m: Match): { x: number; z: number } | null {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  if (ft) {
    if (ft.stage === "whistle" || (ft.stage === "walk" && ft.t < 0.5)) return null;
    const a = m.athletes[ft.shooter]!;
    return ft.spots.get(a.id) ?? { x: a.x, z: a.z };
  }
  const b = m.ball;
  if (m.phase === "live" && b.mode === "flight" && b.shot?.kind === "free") {
    const a = m.athletes[b.shot.shooter]!;
    return { x: a.x, z: a.z };
  }
  return null;
}
