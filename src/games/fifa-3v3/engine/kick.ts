import { other } from "../teams";
import { goalCentre, goalX, shotAngle, toGoal } from "./goal";
import { planDive } from "./keeper";
import { choosePassTarget, leadFor, passVelocity } from "./passing";
import { aimPoint, solveKick } from "./shot-aim";
import { pickOutcome, shotOdds, type ShotContext } from "./shot-odds";
import { PASS, SHOOT, TOUCH } from "./tuning";
import type { Athlete, MatchState, ShotOutcome } from "./types";
import { clamp, clamp01, dist, fromAngle, len, norm, sub, type Vec2 } from "./vec";

export function owns(state: MatchState, a: Athlete): boolean {
  const owner = state.ball.owner;
  return owner?.kind === "athlete" && owner.id === a.id;
}

/** Starts the wind up of a shot. The ball leaves the boot when it ends, if it is still there. */
export function startShot(state: MatchState, a: Athlete, power: number): void {
  a.action = "shoot";
  a.actionT = 0;
  a.actionLen = SHOOT.windup + 0.4;
  a.power = clamp01(power);
  a.charging = false;
  a.charge = 0;
  a.buffered = 0;
  a.actionDir = norm(sub(goalCentre(other(a.team)), a.pos));
}

export function startPass(state: MatchState, a: Athlete, aim: Vec2 | null, to?: number): void {
  const target = to !== undefined ? state.athletes[to] : choosePassTarget(state, a, aim);
  a.action = "pass";
  a.actionT = 0;
  a.actionLen = PASS.windup + 0.3;
  a.passTo = target?.id ?? null;
  a.actionDir = target ? norm(sub(target.pos, a.pos)) : aim && len(aim) > 0.2 ? norm(aim) : fromAngle(a.facing);
  a.charging = false;
  a.charge = 0;
}

/** Called every step of a kick's wind up. Strikes the ball at the right moment. */
export function progressKick(state: MatchState, a: Athlete, before: number): void {
  const windup = a.action === "shoot" ? SHOOT.windup : PASS.windup;
  if (before >= windup || a.actionT < windup || !owns(state, a)) return;
  if (a.action === "shoot") strike(state, a);
  else kickPass(state, a);
}

/** How badly placed the keeper is, 0 set to 1 stranded. */
function keeperOff(state: MatchState, defending: 0 | 1): number {
  const k = state.keepers[defending];
  if (k.action === "dive" || k.action === "getup") return 1;
  const b = state.ball.pos;
  const gx = goalX(defending);
  // The keeper should be on the line from the ball to the middle of the goal.
  const t = (k.pos.x - gx) / (b.x - gx || 1e-6);
  const lineZ = b.z * clamp(t, 0, 1);
  return clamp01((Math.abs(k.pos.z - lineZ) - 0.4) / 1.6);
}

/** The shot itself: the dice choose the outcome from the chance, and physics plays it out. */
function strike(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const defending = other(a.team);
  const keeper = state.keepers[defending];
  const gx = goalX(defending);
  let pressure = 0;
  for (const o of state.athletes) if (o.team !== a.team) pressure = Math.max(pressure, clamp01((2.4 - dist(o.pos, a.pos)) / 1.8));
  const context: ShotContext = {
    distance: toGoal(ball.pos, defending),
    angle: shotAngle(ball.pos, defending),
    shooting: a.shooting,
    pressure,
    keeperOff: keeperOff(state, defending),
    power: a.power,
    // Past the keeper, or the keeper is down or busy: nobody can save it.
    beaten: Math.abs(ball.pos.x - gx) < Math.abs(keeper.pos.x - gx) + 0.8 || keeper.action !== "set",
  };
  let outcome: ShotOutcome = state.options.rig?.(state.shotCount, a.team) ?? pickOutcome(shotOdds(context), state.rng.next());
  // A save needs a keeper between the ball and the goal.
  if (context.beaten && (outcome === "catch" || outcome === "parry")) outcome = "goal";
  const target = aimPoint(outcome, defending, keeper, state.rng);
  const speed = clamp(SHOOT.minSpeed + context.distance * 0.45 + a.power * 9, SHOOT.minSpeed, SHOOT.maxSpeed);
  const curl = state.rng.range(-1, 1) * (3 + 8 * a.shooting);
  const kick = solveKick({ ...ball.pos }, target, speed, curl);
  ball.owner = null;
  ball.vel = kick.vel;
  ball.spin = kick.spin;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.passTo = null;
  a.noTouch = TOUCH.afterKick;
  a.stats.shots++;
  state.shotCount++;
  state.flight = { shooter: a.id, team: a.team, outcome, t: 0, target, keeperX: keeper.pos.x, power: a.power, resolved: false };
  planDive(state, keeper);
  state.events.push({ type: "shot", athlete: a.id, team: a.team, outcome, power: a.power, distance: context.distance });
}

function kickPass(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const receiver = a.passTo !== null ? state.athletes[a.passTo] : undefined;
  const to = receiver ? leadFor(ball.pos, receiver) : { x: ball.pos.x + a.actionDir.x * 9, z: ball.pos.z + a.actionDir.z * 9 };
  ball.owner = null;
  ball.vel = passVelocity(ball.pos, to);
  ball.spin = { x: 0, y: 0, z: 0 };
  ball.lastTouch = { team: a.team, id: a.id };
  ball.passTo = receiver?.id ?? null;
  a.noTouch = TOUCH.afterKick;
  a.stats.passes++;
  state.events.push({ type: "pass", athlete: a.id, to: receiver?.id ?? null });
}
