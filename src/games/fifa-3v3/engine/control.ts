import { canPlay, footPoint } from "./athlete";
import { ballSpeed } from "./ball";
import { firstTime } from "./buttons";
import { TOUCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { dist } from "./vec";

/**
 * A loose ball near a player's feet is brought under control by the
 * nearest one who can play it. A hard ball may bounce off a poor first
 * touch. A player who pressed Shoot as it arrived hits it first time.
 */
export function tryControl(state: MatchState): void {
  const ball = state.ball;
  const shotLive = state.flight !== null && !state.flight.resolved;
  if (ball.owner || shotLive || ball.inGoal !== null || ball.pos.y > 0.95) return;
  let best: Athlete | null = null;
  let bestD = Infinity;
  for (const a of state.athletes) {
    if (a.noTouch > 0 || !canPlay(a)) continue;
    const d = dist(footPoint(a), ball.pos);
    if (d < TOUCH.controlRange + 0.18 * a.dribbling && d < bestD) {
      best = a;
      bestD = d;
    }
  }
  if (!best) return;
  const speed = ballSpeed(ball);
  if (speed > TOUCH.hardBall && state.rng.chance(0.5 - 0.35 * best.dribbling)) {
    // A heavy touch: the ball cannons off the boot.
    ball.vel.x = -ball.vel.x * 0.25 + state.rng.range(-2, 2);
    ball.vel.z = -ball.vel.z * 0.25 + state.rng.range(-2, 2);
    ball.lastTouch = { team: best.team, id: best.id };
    best.noTouch = 0.3;
    return;
  }
  const from = ball.lastTouch?.team ?? null;
  ball.owner = { kind: "athlete", id: best.id };
  ball.lastTouch = { team: best.team, id: best.id };
  ball.passTo = null;
  ball.heldFor = 0;
  best.brain.carried = 0;
  state.events.push({ type: "control", athlete: best.id, team: best.team, from });
  // A first time kick, aimed the way the stick pointed when Shoot/Pass was pressed.
  firstTime(state, best);
}
