import type { Match } from "../engine/match";
import { lineBouncing } from "../engine/free-throw";
import { dist2 } from "../engine/vec";
import type { AthleteView } from "./athlete-view";
import type { CeremonyStage } from "./ceremony/ceremony-stage";
import { lineScene, pressureOn } from "./scene-read";

/**
 * Poses every player for this frame from what the match says is going
 * on round them: who has the ball and how, who is guarding him, a pass
 * on its way, the free throw line, the winners and the ceremony.
 * Returns whether the ball is held at the chest rather than dribbled.
 */
export function poseAthletes(m: Match, views: readonly AthleteView[], ceremony: CeremonyStage, dt: number): boolean {
  const b = m.ball;
  const holder = b.holder;
  const onBall = holder !== null ? m.athletes[holder] : null;
  // During the check, and at the free throw line before the shot, the ball is held at the chest, not dribbled,
  // except for the shooter's bounces to settle at the line.
  const shooting = onBall?.action.kind === "shoot";
  const chest = m.phase === "check" || (m.phase === "freeThrow" && !shooting && !lineBouncing(m));
  const pressure = onBall ? pressureOn(m, onBall) : 0;
  const winner = m.phase === "over" && m.phaseT > 1 ? m.winner : null;
  for (const [i, view] of views.entries()) {
    const a = m.athletes[i]!;
    const guarding = !!onBall && onBall.team !== a.team && m.phase === "live" && dist2(a, onBall) < 2.6 && a.action.kind === "none";
    const incoming = b.mode === "flight" && b.passTo === a.id && a.action.kind === "none" ? 1 - Math.hypot(b.pos.x - a.x, b.pos.z - a.z) / 3 : 0;
    const line = lineScene(m, a);
    const role = ceremony.roleOf(a.id);
    const holding = holder === a.id;
    const contest = guarding && onBall?.action.kind === "shoot" && !onBall.action.free ? Math.min(1, onBall.action.t / 0.3) : 0;
    // The ball's side of a guarding defender, along his left: (cos yaw, -sin yaw).
    const ballSide = guarding ? Math.max(-1, Math.min(1, ((b.pos.x - a.x) * Math.cos(a.yaw) - (b.pos.z - a.z) * Math.sin(a.yaw)) / 0.3)) : 0;
    view.update(a, { holding, chest, receiving: Math.max(0, incoming), guarding, ballSide, pressure: holding ? pressure : 0, ...line, winner, ceremony: role, ball: holding || incoming > 0 ? b : null, flight: a.action.kind === "block" && b.mode === "flight" ? b : null, contest }, dt);
  }
  return chest;
}
