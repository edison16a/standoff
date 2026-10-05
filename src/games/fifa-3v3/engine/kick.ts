import { goalCentre } from "./goal";
import { needsAir, type KickPlan } from "./assist";
import { leadShare, passError, passZip } from "./build-effects";
import { leadFor, loftVelocity, passVelocity, rollingSpin } from "./passing";
import { strike } from "./strike";
import { ASSIST, PASS, PITCH, SHOOT, TOUCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, clamp01, dist, fromAngle, len, norm, sub, type Vec2 } from "./vec";
import { other } from "../teams";

export function owns(state: MatchState, a: Athlete): boolean {
  const owner = state.ball.owner;
  return owner?.kind === "athlete" && owner.id === a.id;
}

/** Turns a Shoot press into the kick the assist chose: a shot, a pass or a ball into space. */
export function startKick(state: MatchState, a: Athlete, plan: KickPlan, power: number): void {
  if (plan.kind === "shot") return startShot(state, a, power, plan.aimZ);
  if (plan.kind === "pass") return startPass(state, a, state.athletes[plan.to] ?? null, null, plan.air, power);
  startPass(state, a, null, plan.dir, plan.air, power);
}

/** Starts the wind up of a shot. The ball leaves the boot when it ends, if it is still there. */
export function startShot(state: MatchState, a: Athlete, power: number, aimZ: number | null = null): void {
  a.action = "shoot";
  a.actionT = 0;
  a.power = clamp01(power);
  a.actionLen = shotWindup(a.power) + 0.4;
  a.aimZ = aimZ;
  a.firstTime = false;
  a.charging = false;
  a.charge = 0;
  a.buffered = 0;
  const goal = goalCentre(other(a.team));
  a.actionDir = norm(sub({ x: goal.x, z: aimZ ?? 0 }, a.pos));
}

/** A bigger backswing for a harder shot. */
export function shotWindup(power: number): number {
  return SHOOT.windup + SHOOT.windupPower * clamp01(power);
}

/** Starts a pass to a team mate, or into space along `dir` when there is nobody to aim at. */
export function startPass(state: MatchState, a: Athlete, to: Athlete | null, dir: Vec2 | null, air: boolean, power = 0.5): void {
  a.action = "pass";
  a.actionT = 0;
  a.actionLen = (air ? PASS.windup + 0.08 : PASS.windup) + 0.3;
  a.passTo = to?.id ?? null;
  a.lofted = air;
  a.power = clamp01(power);
  a.actionDir = to ? norm(sub(to.pos, a.pos)) : dir && len(dir) > 0.2 ? norm(dir) : fromAngle(a.facing);
  a.charging = false;
  a.charge = 0;
  a.buffered = 0;
}

/** A computer player's pass: the target is its own choice, the ground or the air the assist's. */
export function botPass(state: MatchState, a: Athlete, to: number): void {
  const mate = state.athletes[to];
  if (!mate) return;
  startPass(state, a, mate, null, needsAir(state, a, leadFor({ x: a.pos.x, y: 0, z: a.pos.z }, mate, leadShare(a))));
}

/** Called every step of a kick's wind up. Strikes the ball at the right moment. */
export function progressKick(state: MatchState, a: Athlete, before: number): void {
  const windup = a.action === "shoot" ? shotWindup(a.power) : a.lofted ? PASS.windup + 0.08 : PASS.windup;
  if (before >= windup || a.actionT < windup || !owns(state, a)) return;
  if (a.action === "shoot") strike(state, a);
  else kickPass(state, a);
}

function kickPass(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const receiver = a.passTo !== null ? state.athletes[a.passTo] : undefined;
  const reach = ASSIST.spaceLength * (0.75 + 0.6 * a.power);
  let to = receiver ? leadFor(ball.pos, receiver, leadShare(a)) : { x: ball.pos.x + a.actionDir.x * reach, z: ball.pos.z + a.actionDir.z * reach };
  to = offTarget(state, a, to);
  to = { x: clamp(to.x, -PITCH.halfLength + 1, PITCH.halfLength - 1), z: clamp(to.z, -PITCH.halfWidth + 0.8, PITCH.halfWidth - 0.8) };
  ball.owner = null;
  if (a.lofted) {
    const d = dist(ball.pos, to);
    const short = Math.min(PASS.loftShort, d * 0.1);
    const land = { x: to.x - ((to.x - ball.pos.x) / d) * short, z: to.z - ((to.z - ball.pos.z) / d) * short };
    ball.vel = loftVelocity(ball.pos, land);
    // Backspin holds a chipped ball up a touch after it lands.
    ball.spin = { x: -a.actionDir.z * 6, y: 0, z: a.actionDir.x * 6 };
  } else {
    ball.vel = passVelocity(ball.pos, to, PASS.arrive * passZip(a));
    ball.spin = rollingSpin(ball.vel);
  }
  ball.lastTouch = { team: a.team, id: a.id };
  ball.passTo = receiver?.id ?? null;
  a.noTouch = TOUCH.afterKick;
  a.stats.passes++;
  state.events.push({ type: "pass", athlete: a.id, to: receiver?.id ?? null, air: a.lofted });
}

/** Where a pass really goes: a little off the spot it was meant for, less for a better passer. */
function offTarget(state: MatchState, a: Athlete, to: Vec2): Vec2 {
  const d = dist(state.ball.pos, to);
  const miss = d * passError(a) * state.rng.range(0.3, 1);
  const angle = state.rng.range(0, Math.PI * 2);
  return { x: to.x + Math.cos(angle) * miss, z: to.z + Math.sin(angle) * miss };
}
