import { buildOf } from "./athlete";
import { holdAtChest, stepToss } from "./check-toss";
import { ready } from "./free-throw";
import type { Match } from "./match";
import { FREE_THROW as FT } from "./tuning";

/**
 * Moves the ball while the free throws own it: still bouncing where
 * the play left it during the whistle, tossed back to the shooter for
 * the walk and after each shot but the last, at the chest before each
 * shot and bounced twice to settle. Returns false when the ball is left
 * to its normal physics: a shot in flight, or a loose ball at the whistle.
 */
export function stepFreeThrowBall(m: Match, dt: number): boolean {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  if (!ft) return false;
  if (ft.toss) {
    if (stepToss(m, ft.toss, dt)) {
      ft.toss = null;
      m.emit({ type: "catch", id: ft.shooter });
      if (ft.stage === "return") {
        ft.shot++;
        ready(m, ft);
      }
    }
    return true;
  }
  if (ft.stage === "shooting" || ft.stage === "result") return false;
  if (ft.stage === "whistle" && m.ball.holder === null) return false;
  if (lineBouncing(m)) bounceAtLine(m);
  else holdAtChest(m);
  return true;
}

/** True while the shooter bounces the ball at the line, settling before the shot. */
export function lineBouncing(m: Match): boolean {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  return !!ft && ft.stage === "set" && ft.t < FT.bounces && m.holder?.action.kind === "none";
}

/** Two easy bounces in front of the feet, the ball back in the hand as the routine ends. */
function bounceAtLine(m: Match): void {
  const ft = m.freeThrows!;
  const a = m.athletes[ft.shooter]!;
  const before = a.dribble;
  a.dribble = ((ft.t / FT.bounces) * 2) % 1;
  const h = buildOf(a).body.height;
  const drop = 1 - Math.abs(1 - 2 * a.dribble);
  const side = 0.3 * a.dribbleSide;
  const fwd = 0.3;
  m.ball.pos = { x: a.x + Math.sin(a.yaw) * fwd - Math.cos(a.yaw) * side, y: 0.12 + (h * 0.44 - 0.12) * (1 - drop * drop), z: a.z + Math.cos(a.yaw) * fwd + Math.sin(a.yaw) * side };
  m.ball.vel = { x: 0, y: 0, z: 0 };
  if (before < 0.5 && a.dribble >= 0.5) m.emit({ type: "bounce", id: a.id, x: m.ball.pos.x, z: m.ball.pos.z, power: 0.45 });
}
