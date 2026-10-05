import { other } from "../teams";
import { planPass } from "./assist";
import { isHuman } from "./athlete";
import { ballSpeed } from "./ball";
import { leadShare } from "./build-effects";
import { goalCentre, goalX, toGoal } from "./goal";
import { shotWindup } from "./kick";
import { leadFor, loftVelocity } from "./passing";
import type { Rng } from "./rng";
import { solveKick, type Kick } from "./shot-aim";
import { applyError, type StrikeError } from "./shot-error";
import { autoAimZ } from "./shot-plan";
import { sendShot, strike } from "./strike";
import { ASSIST, BALL, PITCH, TOUCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, clamp01, dist, norm, sub, type Vec2, type Vec3 } from "./vec";

/**
 * Headers and volleys. A header sends the ball off the forehead with
 * some of its own pace and what the neck and body put into it, never as
 * hard as a kick, and less precisely: at goal near it (aimed down, the
 * way strikers are taught), cleared high and long near his own, and on
 * to a team mate anywhere else. A volley is a shot struck as the ball
 * drops, with all the extra error a ball in the air brings (strike.ts).
 */
export const HEAD = {
  /** The share of the ball's own pace it keeps off the head, what the neck adds, and a strong man's extra. */
  keep: 0.35,
  neck: 7,
  strength: 5,
  /** The hardest a ball can be headed, m/s. */
  max: 22,
  /** Spread of a header's direction, radians: the best finisher's, the worst's extra, and the share more with a man on him. */
  clean: 0.05,
  skill: 0.07,
  pressure: 0.5,
  /** Inside this distance of his own goal a header is a clearance, sent this far up the pitch. */
  clearFrom: 14,
  clearLength: 22,
  /** How long a standing nod takes. */
  nod: 0.34,
} as const;

/** The widest a headed shot is aimed and still meant for inside the post. */
const AIM_WIDE = PITCH.goalHalfWidth - PITCH.postRadius - BALL.radius - 0.15;

/** How close the nearest opponent is: 0 at 2.4 m or more, 1 right on him. */
function pressureOn(state: MatchState, a: Athlete): number {
  let p = 0;
  for (const o of state.athletes) if (o.team !== a.team) p = Math.max(p, clamp01((2.4 - dist(o.pos, a.pos)) / 1.8));
  return p;
}

/** A header's error: turned and lifted a little, its pace a touch off. */
function headError(rng: Rng, sigma: number): StrikeError {
  return { yaw: rng.gauss() * sigma, pitch: rng.gauss() * sigma * 0.75, pace: clamp(1 + rng.gauss() * 0.06, 0.8, 1.1), spin: rng.gauss() * 3, mishit: false };
}

/** Heads the ball. `atGoal` makes it a shot. */
export function headerAt(state: MatchState, a: Athlete, atGoal: boolean): void {
  const ball = state.ball;
  const speed = Math.min(HEAD.max, HEAD.keep * ballSpeed(ball) + HEAD.neck + HEAD.strength * a.attrs.strength);
  const sigma = (HEAD.clean + HEAD.skill * (1 - a.attrs.finishing)) * (1 + HEAD.pressure * pressureOn(state, a));
  const stick = isHuman(a) ? (a.bufferAim ?? a.want) : null;
  // A nod where he stands; met in a leap, the leap goes on.
  if (a.action !== "header") {
    a.action = "header";
    a.actionT = 0;
    a.actionLen = HEAD.nod;
  }
  a.noTouch = TOUCH.afterKick;
  a.buffered = 0;
  a.bufferAim = null;
  state.events.push({ type: "header", athlete: a.id, team: a.team, speed });
  if (atGoal) return headAtGoal(state, a, speed, sigma, stick);
  const aim = headAim(state, a, stick);
  const kick: Kick = { vel: loftVelocity(ball.pos, aim.spot), spin: { x: 0, y: 0, z: 0 }, time: 1 };
  const pace = Math.hypot(kick.vel.x, kick.vel.y, kick.vel.z);
  // A header only reaches so far: a long one falls short of where it was meant.
  if (pace > speed) kick.vel = { x: (kick.vel.x * speed) / pace, y: (kick.vel.y * speed) / pace, z: (kick.vel.z * speed) / pace };
  const off = applyError(kick, headError(state.rng, sigma));
  ball.owner = null;
  ball.vel = off.vel;
  ball.spin = off.spin;
  ball.wobble = 0;
  ball.travel = 0;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.struckAt = state.time;
  ball.passTo = aim.mate;
  if (aim.mate !== null) a.stats.passes++;
}

/** At goal: aimed low into a corner, or where the stick says, for the keeper to read like any shot. */
function headAtGoal(state: MatchState, a: Athlete, speed: number, sigma: number, stick: Vec2 | null): void {
  const ball = state.ball;
  const foe = other(a.team);
  const keeper = state.keepers[foe];
  const rigged = state.options.rig?.(state.shotCount, a.team) === "goal";
  const side = stick && Math.abs(stick.z) > 0.4 ? Math.sign(stick.z) * AIM_WIDE : null;
  const z = rigged ? (keeper.pos.z > 0 ? -1 : 1) * (AIM_WIDE - 0.4) : (side ?? clamp(autoAimZ(ball.pos, keeper.pos), -AIM_WIDE, AIM_WIDE));
  const target: Vec3 = { x: goalX(foe), y: rigged ? 0.6 : state.rng.range(0.3, 1.7), z };
  let kick = solveKick({ ...ball.pos }, target, speed, 0);
  if (!rigged) kick = applyError(kick, headError(state.rng, sigma));
  a.power = clamp01((speed - 8) / 14);
  sendShot(state, a, kick, target, { rigged, distance: toGoal(ball.pos, foe), header: true });
}

/** Where a header that is not a shot goes: cleared near his own goal, else on to a team mate or into space. */
function headAim(state: MatchState, a: Athlete, stick: Vec2 | null): { spot: Vec2; mate: number | null } {
  const ball = state.ball;
  const up = Math.sign(goalX(other(a.team)) - goalX(a.team));
  if (toGoal(a.pos, a.team) < HEAD.clearFrom) {
    // High and long, up the pitch and out toward the side he is on, away from the middle.
    const wide = Math.sign(ball.pos.z) || 1;
    return { spot: { x: ball.pos.x + up * HEAD.clearLength, z: clamp(ball.pos.z + wide * 5, -PITCH.halfWidth + 2, PITCH.halfWidth - 2) }, mate: null };
  }
  const plan = planPass(state, a, stick);
  if (plan.kind === "pass") {
    const mate = state.athletes[plan.to]!;
    return { spot: leadFor(ball.pos, mate, leadShare(a)), mate: mate.id };
  }
  const dir = plan.kind === "space" ? plan.dir : { x: up, z: 0 };
  return { spot: { x: ball.pos.x + dir.x * ASSIST.spaceLength, z: ball.pos.z + dir.z * ASSIST.spaceLength }, mate: null };
}

/**
 * A volley: the shot struck now, as the ball drops, at the power the bar
 * reached. The swing is already through, so the kick is played the
 * moment it starts.
 */
export function volley(state: MatchState, a: Athlete, power: number, aimZ: number | null): boolean {
  a.action = "shoot";
  a.power = clamp01(power);
  a.aimZ = aimZ;
  a.actionT = shotWindup(a.power);
  a.actionLen = a.actionT + 0.4;
  a.firstTime = true;
  a.charging = false;
  a.charge = 0;
  a.buffered = 0;
  a.bufferAim = null;
  const goal = goalCentre(other(a.team));
  a.actionDir = norm(sub({ x: goal.x, z: aimZ ?? 0 }, a.pos));
  strike(state, a);
  return true;
}
