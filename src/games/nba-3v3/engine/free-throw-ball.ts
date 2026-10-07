import { holdAtChest, stepToss } from "./check-toss";
import { dribbleBall } from "./dribble-ball";
import { ready } from "./free-throw";
import { holdForOfficial } from "./free-throw-ref";
import type { Match } from "./match";
import { FREE_THROW as FT } from "./tuning";

/**
 * Moves the ball while the free throws own it: still bouncing where
 * the play left it during the whistle, tossed back to the shooter for
 * the walk, in the referee's hands between shots and bounce passed up
 * to the shooter, at the chest before each shot and bounced twice to
 * settle. Returns false when the ball is left to its normal physics: a
 * shot in flight, a ball the referee has not reached yet, or a loose
 * ball at the whistle.
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
  const o = ft.official;
  // The referee's wind up for the bounce pass carries the ball itself, as does a ball thrown in to him.
  if (ft.stage === "return" || o.incoming) return true;
  if (ft.stage === "collect" || ft.stage === "carry") {
    if (!o.holding) return false;
    holdForOfficial(m, o, dt);
    return true;
  }
  if (ft.stage === "whistle" && m.ball.holder === null) return false;
  if (lineBouncing(m)) bounceAtLine(m, dt);
  else holdAtChest(m, dt);
  return true;
}

/** True while the shooter bounces the ball at the line, settling before the shot. */
export function lineBouncing(m: Match): boolean {
  const ft = m.phase === "freeThrow" ? m.freeThrows : null;
  return !!ft && ft.stage === "set" && ft.t < FT.bounces && m.holder?.action.kind === "none";
}

/** Two easy bounces in front of the feet on the same dribble physics, the ball back in the hand as the routine ends. */
function bounceAtLine(m: Match, dt: number): void {
  const a = m.athletes[m.freeThrows!.shooter]!;
  dribbleBall(m, a, dt, 2 / FT.bounces);
}
