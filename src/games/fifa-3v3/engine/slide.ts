import { integrate } from "./athlete";
import { foulRisk, tackleEdge } from "./build-effects";
import { commitFoul } from "./foul";
import { impact } from "./physics/impulse";
import { foulChance, knockDown } from "./tackle";
import { BALL, SLIDE } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, dot, fromAngle, len, norm, type Vec2 } from "./vec";

/**
 * The slide tackle, done with real contact. The sliding boot is a hard
 * moving object at the end of the leg: if it gets to the ball it knocks
 * it on with the slide's pace (a strong man knocks it further); if the
 * leg reaches the man first it takes his feet. Getting the ball first
 * is clean even if the man goes over afterwards; the man first, or
 * through the back of him, the referee may well give it. A dribbler who
 * sees it coming can hop it, flicking the ball up over the boot.
 */
const BOOT = 0.16;
const LEG = 0.22;

/** Throws the player into a slide along `dir`, or the way they face if the stick is centred. */
export function startSlide(state: MatchState, a: Athlete, dir: Vec2): void {
  const d = len(dir) > 0.2 ? norm(dir) : fromAngle(a.facing);
  const speed = SLIDE.speed + 1.4 * a.attrs.pace;
  a.action = "slide";
  a.actionT = 0;
  a.actionLen = SLIDE.duration;
  a.actionDir = d;
  a.facing = Math.atan2(d.z, d.x);
  a.vel = { x: d.x * speed, z: d.z * speed };
  a.slideDone = false;
  a.charging = false;
  a.charge = 0;
  state.events.push({ type: "slide", athlete: a.id });
  readSlide(state, a);
}

/**
 * The dribbler the slide is coming at decides as it starts whether he
 * has seen it in time: better close control and a slide from in front
 * make the hop likelier; a good tackler and one from behind, less.
 */
function readSlide(state: MatchState, a: Athlete): void {
  const owner = state.ball.owner;
  const victim = owner?.kind === "athlete" ? state.athletes[owner.id] : undefined;
  if (!victim || victim.team === a.team || dist(victim.pos, a.pos) > 4) return;
  const fromBehind = Math.max(0, dot(a.actionDir, fromAngle(victim.facing)));
  const hop = clamp(0.38 - tackleEdge(a, victim) + 0.35 * (victim.attrs.dribbling - 0.75) + 0.15 * (1 - fromBehind) - 0.2 * fromBehind, 0.08, 0.8);
  victim.readSlide = state.rng.chance(hop);
}

/** One step of a slide: it skids to a stop, and the boot can meet the ball or the man once. */
export function updateSlide(state: MatchState, a: Athlete, dt: number): void {
  const speed = len(a.vel);
  const next = Math.max(0, speed - SLIDE.friction * dt);
  if (speed > 0) {
    a.vel.x *= next / speed;
    a.vel.z *= next / speed;
  }
  integrate(a, dt);
  if (a.actionT > 0.04 && a.actionT < SLIDE.duration - 0.08) contact(state, a);
  if (a.actionT >= a.actionLen) {
    a.action = "getup";
    a.actionT = 0;
    a.actionLen = SLIDE.getUp + (a.slideDone ? 0 : SLIDE.missPenalty);
  }
}

function contact(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const boot = { x: a.pos.x + a.actionDir.x * SLIDE.reach, y: 0.12, z: a.pos.z + a.actionDir.z * SLIDE.reach };
  const owner = ball.owner?.kind === "athlete" ? state.athletes[ball.owner.id] : undefined;
  const victim = owner && owner.team !== a.team ? owner : undefined;
  // He saw it coming: up and over the boot, ball and all.
  if (victim && victim.readSlide && victim.action !== "hurdle" && dist(boot, victim.pos) < 1.2) hop(state, a, victim);
  const shotLive = state.flight !== null && !state.flight.resolved;
  const toBall = Math.hypot(ball.pos.x - boot.x, ball.pos.y - boot.y, ball.pos.z - boot.z);
  if (!a.slideDone && !shotLive && ball.owner?.kind !== "keeper" && toBall < BOOT + BALL.radius) return winBall(state, a, victim, boot);
  if (!victim || victim.action === "hurdle" || victim.action === "stumble") return;
  // The leg along the turf from the hip to the boot, against his feet.
  if (legGap(a, victim.pos) < LEG + 0.18) takeTheMan(state, a, victim);
}

/** How far a point is from the sliding leg, hip to boot along the turf. */
function legGap(a: Athlete, p: Vec2): number {
  const t = clamp((p.x - a.pos.x) * a.actionDir.x + (p.z - a.pos.z) * a.actionDir.z, 0, SLIDE.reach);
  return Math.hypot(p.x - (a.pos.x + a.actionDir.x * t), p.z - (a.pos.z + a.actionDir.z * t));
}

/** The boot meets the ball first: it is knocked on, physically, and it is clean. */
function winBall(state: MatchState, a: Athlete, victim: Athlete | undefined, boot: { x: number; y: number; z: number }): void {
  const ball = state.ball;
  // The boot comes in low and through the ball: off its upper side a little, so the ball pops up as it goes.
  const flat = norm({ x: ball.pos.x - boot.x, z: ball.pos.z - boot.z });
  const n = { x: flat.x * 0.94, y: 0.34, z: flat.z * 0.94 };
  impact(ball, { n, vel: { x: a.vel.x, y: 0, z: a.vel.z }, restitution: 0.3 + 0.35 * a.attrs.strength, friction: 0.5 });
  a.slideDone = true;
  ball.owner = null;
  ball.lastTouch = { team: a.team, id: a.id };
  ball.struckAt = state.time;
  ball.passTo = null;
  a.noTouch = 0.5;
  if (victim) {
    a.stats.tackles++;
    victim.noTouch = 0.4;
    // The follow through takes his legs, but the ball was won first.
    if (legGap(a, victim.pos) < LEG + 0.3) knockDown(state, victim);
  }
  state.events.push({ type: "tackle", athlete: a.id, victim: victim?.id ?? null, won: true });
}

/** The leg gets to the man before the ball. */
function takeTheMan(state: MatchState, a: Athlete, victim: Athlete): void {
  a.slideDone = true;
  const fromBehind = Math.max(0, dot(a.actionDir, fromAngle(victim.facing)));
  if (state.rng.chance(foulChance(fromBehind, true) * foulRisk(a))) return commitFoul(state, a, victim, "slide");
  // Waved on: he goes down and the ball runs on loose.
  state.ball.owner = null;
  knockDown(state, victim);
  state.events.push({ type: "tackle", athlete: a.id, victim: victim.id, won: true });
}

/** The dribbler hops the slide and lifts the ball over the boot with him. */
function hop(state: MatchState, a: Athlete, victim: Athlete): void {
  const ball = state.ball;
  victim.action = "hurdle";
  victim.actionT = 0;
  victim.actionLen = SLIDE.hurdle;
  victim.readSlide = false;
  if (dist(ball.pos, victim.pos) < 1.2 && ball.pos.y < 0.3) {
    ball.vel = { x: victim.vel.x, y: 2.9, z: victim.vel.z };
    ball.lastTouch = { team: victim.team, id: victim.id };
  }
  state.events.push({ type: "tackle", athlete: a.id, victim: victim.id, won: false });
}
