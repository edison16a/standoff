import { isDown, setAction } from "./athlete";
import { autoPicker, leadTarget, releasePoint } from "./aim";
import { BALL_DRAG, solveLaunch, stepSpiral } from "./ball";
import { botSkill, isBot } from "./bot-skill";
import { outOfBounds } from "./field";
import { DIVE, THROW } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, flat, len, len3, lerp, norm3, v3 } from "./vec";

/** A defender close enough to hurry the throw, which loosens the spiral. */
function rushed(state: MatchState, qb: Athlete): boolean {
  return len(qb.vel) > 5 || qb.action === "juke" || state.athletes.some((d) => d.team !== qb.team && !isDown(d) && dist(d.pos, qb.pos) < 3);
}

/**
 * Lets the ball go to the lit receiver. The throw is aimed where the
 * receiver will be, launched along the real flight so it gets there, and
 * given spin and wobble from the arm and the pressure.
 */
export function throwPass(state: MatchState, qb: Athlete, targetId: number): void {
  const target = state.athletes[targetId];
  if (!target) return;
  const from = releasePoint(qb);
  const { at, eta } = leadTarget(qb, target);
  const vel = solveLaunch(from, at, eta, BALL_DRAG.spiral);
  const ball = state.ball;
  ball.mode = "spiral";
  ball.holder = null;
  ball.pos = from;
  ball.vel = vel;
  ball.axis = norm3(vel);
  ball.spinRate = lerp(THROW.spinLow, THROW.spinHigh, qb.arm);
  ball.wobble = THROW.wobble * (1.4 - qb.arm) + (rushed(state, qb) ? THROW.wobbleRushed : 0);
  ball.wobblePhase = 0;
  const picker = autoPicker(state, qb, at);
  state.play.pass = { thrower: qb.id, target: targetId, from, catchAt: at, eta, t: 0, pickBy: picker?.id ?? null, tested: [], tipped: false, speed: len3(vel) };
  state.play.thrown = true;
  state.play.carrier = null;
  state.play.target = targetId;
  qb.stats.attempts++;
  setAction(qb, "throw", THROW.throwTime);
  state.events.push({ type: "throw", athlete: qb.id, target: targetId, speed: len3(vel), spin: ball.spinRate, distance: dist(qb.pos, { x: at.x, z: at.z }) });
}

/** How far a player's hands reach toward the ball, further in a dive. */
function reach(a: Athlete, base: number): number {
  return a.action === "dive" ? base + DIVE.reach : base;
}

function inHands(state: MatchState, a: Athlete, radius: number): boolean {
  const b = state.ball.pos;
  return !isDown(a) && b.y < THROW.jumpReach && b.y > 0.2 && dist(a.pos, flat(b)) < reach(a, radius);
}

/** Someone takes the ball out of the air. */
function catchBall(state: MatchState, a: Athlete, intercepted: boolean, auto = false): void {
  const play = state.play;
  const ball = state.ball;
  play.pass = null;
  play.target = null;
  if (outOfBounds(a.pos.x, a.pos.z)) {
    // Caught with a foot out: no catch.
    endIncomplete(state);
    return;
  }
  ball.mode = "held";
  ball.holder = a.id;
  ball.vel = v3();
  play.carrier = a.id;
  play.carrierTeam = a.team;
  play.gotAt = a.pos.x;
  if (intercepted) {
    play.intercepted = true;
    a.stats.interceptions++;
    state.events.push({ type: "interception", athlete: a.id, team: a.team, auto });
    // On a try the ball is dead the moment the defence has it.
    if (play.isTry) {
      play.end = "turnover";
      play.spot = { x: state.drive.los, z: state.drive.ballZ };
    }
  } else {
    play.receiver = a.id;
    a.stats.catches++;
    const qb = state.athletes.find((q) => q.team === a.team && q.role === "qb");
    if (qb) qb.stats.completions++;
    state.events.push({ type: "catch", athlete: a.id, team: a.team });
  }
}

function endIncomplete(state: MatchState): void {
  const play = state.play;
  play.pass = null;
  play.target = null;
  play.end = "incomplete";
  play.spot = { x: state.drive.los, z: state.drive.ballZ };
  state.ball.mode = "loose";
  state.events.push({ type: "incomplete" });
}

/** The chance a defender who gets a hand to the ball holds on to it, rather than knocking it down. */
export function pickChance(state: MatchState, d: Athlete): number {
  const base = lerp(THROW.pickLow, THROW.pickHigh, d.hands);
  return isBot(d) ? base * (0.5 + 0.5 * botSkill(state).accuracy) : base;
}

/**
 * The ball in the air, each step. A defender standing in front of the
 * target takes it; one who gets into its path may pick it or tip it; the
 * target catches it; and if it reaches the grass it is incomplete.
 */
export function stepPass(state: MatchState, dt: number): void {
  const pass = state.play.pass;
  if (!pass) return;
  pass.t += dt;
  stepSpiral(state.ball, dt);
  const picker = pass.pickBy === null ? null : state.athletes[pass.pickBy];
  if (picker && !pass.tipped && inHands(state, picker, THROW.catchReach)) return catchBall(state, picker, true, true);
  const team = state.athletes[pass.thrower]?.team;
  for (const a of state.athletes) {
    if (pass.tested.includes(a.id) || a.id === pass.thrower || a.id === pass.target || a.id === pass.pickBy) continue;
    // Guard tails a runner; only a player steering himself into the path can intercept.
    if (a.team !== team && a.guard.held) continue;
    if (!inHands(state, a, THROW.touchReach)) continue;
    pass.tested.push(a.id);
    if (a.team === team) {
      if (!pass.tipped && state.rng.chance(a.hands)) return catchBall(state, a, false);
      continue;
    }
    if (!pass.tipped && state.rng.chance(pickChance(state, a))) return catchBall(state, a, true);
    tip(state, a);
  }
  const target = state.athletes[pass.target];
  if (target && !pass.tipped && inHands(state, target, THROW.catchReach)) return catchBall(state, target, false);
  if (state.ball.pos.y <= 0.12) endIncomplete(state);
}

/** A hand gets to it: the ball pops up and away, and nobody can catch it now. */
function tip(state: MatchState, a: Athlete): void {
  const pass = state.play.pass!;
  const ball = state.ball;
  pass.tipped = true;
  ball.vel = v3(ball.vel.x * 0.25 + state.rng.range(-2, 2), clamp(Math.abs(ball.vel.y) * 0.4 + 3, 3, 6), ball.vel.z * 0.25 + state.rng.range(-2, 2));
  ball.wobble = 0.6;
  state.events.push({ type: "tipped", athlete: a.id });
}
