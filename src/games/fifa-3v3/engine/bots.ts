import { attackSign, other } from "../teams";
import { closestOfTeam, markSpot, markTarget, shapeSpot, supportSpot, throwSpot } from "./bot-shape";
import { goalX, shotAngle, toGoal } from "./goal";
import { owns } from "./kick";
import { choosePassTarget, openness } from "./passing";
import { PITCH } from "./tuning";
import type { Athlete, Command, MatchState } from "./types";
import { add, clamp, dist, dot, len, norm, scale, sub, type Vec2 } from "./vec";

const STILL: Vec2 = { x: 0, z: 0 };

/**
 * A computer player's controls for one step. Where to run is worked out
 * every step so it tracks a moving ball; decisions to shoot, pass or
 * slide are taken a few times a second, like a person reacting.
 */
export function botCommand(state: MatchState, a: Athlete, dt: number): Command {
  const brain = a.brain;
  brain.thinkIn -= dt;
  brain.slideWait -= dt;
  brain.passWait -= dt;
  brain.callFor -= dt;
  const carrying = owns(state, a);
  brain.carried = carrying ? brain.carried + dt : 0;
  if (state.phase !== "play") return { move: STILL };
  const target = carrying ? dribbleSpot(state, a) : runSpot(state, a);
  const command: Command = { move: approach(a, target) };
  if (brain.thinkIn > 0 || a.action !== "free") return command;
  brain.thinkIn = state.rng.range(0.12, 0.24);
  if (carrying) decideWithBall(state, a, command);
  else decideWithout(state, a, command);
  return command;
}

/** Full speed toward a far spot, easing off to stand still on it. */
function approach(a: Athlete, target: Vec2): Vec2 {
  const to = sub(target, a.pos);
  const d = len(to);
  if (d < 0.25) return STILL;
  return scale(norm(to), clamp(d / 1.4, 0.25, 1));
}

/** Toward goal, swerving round defenders in the way and away from the boards. */
function dribbleSpot(state: MatchState, a: Athlete): Vec2 {
  const goal = { x: goalX(other(a.team)), z: 0 };
  const straight = norm(sub(goal, a.pos));
  const perp = { x: -straight.z, z: straight.x };
  let dir = straight;
  for (const o of state.athletes) {
    if (o.team === a.team) continue;
    const away = sub(a.pos, o.pos);
    const d = len(away);
    if (d > 3.5 || dot(away, straight) > 0) continue;
    // Step round the defender on whichever side they are not.
    const side = Math.sign(dot(away, perp)) || 1;
    dir = add(dir, perp, (side * 1.4) / Math.max(0.6, d));
  }
  if (Math.abs(a.pos.z) > PITCH.halfWidth - 2.2) dir.z -= Math.sign(a.pos.z) * 0.9;
  return add(a.pos, norm(dir), 3);
}

/** Where to be without the ball: supporting, pressing, marking or chasing it down. */
function runSpot(state: MatchState, a: Athlete): Vec2 {
  const ball = state.ball;
  const owner = ball.owner;
  if (owner?.kind === "keeper") return owner.team === a.team ? throwSpot(a) : shapeSpot(state, a);
  const shotLive = state.flight !== null && !state.flight.resolved;
  if (shotLive) {
    // Attackers follow in for the rebound; defenders get back.
    if (state.flight!.team !== a.team) return shapeSpot(state, a);
    const s = attackSign(a.team);
    return { x: goalX(other(a.team)) - s * 4.5, z: a.slot === 1 ? -2 : a.slot === 2 ? 2 : 0 };
  }
  if (owner?.kind === "athlete") {
    const carrier = state.athletes[owner.id]!;
    if (carrier.team === a.team) return supportSpot(state, a, carrier);
    if (closestOfTeam(state, a, carrier.pos)) {
      // Goal side of the dribbler, a step ahead of where they are going.
      const own = { x: goalX(a.team), z: 0 };
      return add(add(carrier.pos, norm(sub(own, carrier.pos)), 0.7), carrier.vel, 0.25);
    }
    const mark = markTarget(state, a, carrier);
    return mark ? markSpot(a, mark, 1.6) : shapeSpot(state, a);
  }
  const d = dist(a.pos, ball.pos);
  const ahead = Math.min(0.8, d / 7);
  const predicted = { x: ball.pos.x + ball.vel.x * ahead, z: ball.pos.z + ball.vel.z * ahead };
  if (ball.passTo === a.id || closestOfTeam(state, a, predicted)) return predicted;
  return shapeSpot(state, a);
}

function decideWithBall(state: MatchState, a: Athlete, command: Command): void {
  const brain = a.brain;
  const rng = state.rng;
  if (brain.caller !== null && brain.callFor > 0) {
    const caller = state.athletes[brain.caller];
    brain.caller = null;
    if (caller && caller.team === a.team && dist(caller.pos, a.pos) < 24) {
      command.passTo = caller.id;
      return;
    }
  }
  const foe = other(a.team);
  const d = toGoal(a.pos, foe);
  const range = 8 + 5 * a.shooting;
  let pressure = 0;
  for (const o of state.athletes) if (o.team === foe) pressure = Math.max(pressure, clamp((2.4 - dist(o.pos, a.pos)) / 1.8, 0, 1));
  if (d < range && shotAngle(a.pos, foe) < 1.05) {
    const p = 0.28 + 0.5 * (1 - d / range) + pressure * 0.2 + (brain.carried > 3 ? 0.2 : 0);
    if (rng.chance(p)) {
      command.shoot = rng.range(0.15, 0.8);
      return;
    }
  }
  if (brain.passWait > 0) return;
  if (pressure > 0.35 || brain.carried > 2.4) {
    const target = choosePassTarget(state, a, null);
    if (target && openness(state, target) > 2 && rng.chance(0.55)) {
      command.passTo = target.id;
      brain.passWait = rng.range(1, 2);
    }
  }
}

function decideWithout(state: MatchState, a: Athlete, command: Command): void {
  const owner = state.ball.owner;
  if (owner?.kind !== "athlete" || a.brain.slideWait > 0) return;
  const carrier = state.athletes[owner.id]!;
  if (carrier.team === a.team || carrier.action === "hurdle") return;
  const d = dist(a.pos, carrier.pos);
  if (d > 2.6 || d < 0.5 || !closestOfTeam(state, a, carrier.pos)) return;
  if (!state.rng.chance(0.3)) return;
  const aim = add(state.ball.pos, carrier.vel, 0.3);
  command.move = norm(sub(aim, a.pos));
  command.slide = true;
  a.brain.slideWait = state.rng.range(2.5, 4.5);
}
