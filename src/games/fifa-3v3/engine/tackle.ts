import { footPoint, integrate } from "./athlete";
import { SLIDE } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, dot, fromAngle, len, norm, type Vec2 } from "./vec";

/** Throws the player into a slide along `dir`, or the way they face if the stick is centred. */
export function startSlide(state: MatchState, a: Athlete, dir: Vec2): void {
  const d = len(dir) > 0.2 ? norm(dir) : fromAngle(a.facing);
  const speed = SLIDE.speed + 1.4 * a.speed;
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
  if (!a.slideDone && a.actionT > 0.04 && a.actionT < SLIDE.duration - 0.08) contact(state, a);
  if (a.actionT >= a.actionLen) {
    a.action = "getup";
    a.actionT = 0;
    a.actionLen = SLIDE.getUp + (a.slideDone ? 0 : SLIDE.missPenalty);
  }
}

function contact(state: MatchState, a: Athlete): void {
  const ball = state.ball;
  const boot = { x: a.pos.x + a.actionDir.x * SLIDE.reach, z: a.pos.z + a.actionDir.z * SLIDE.reach };
  const owner = ball.owner;
  if (owner?.kind === "athlete") {
    const victim = state.athletes[owner.id];
    if (!victim || victim.team === a.team || victim.action === "hurdle") return;
    if (dist(boot, ball.pos) < SLIDE.contact || dist(boot, victim.pos) < SLIDE.contact) resolve(state, a, victim);
    return;
  }
  const shotLive = state.flight !== null && !state.flight.resolved;
  if (owner || shotLive || ball.pos.y > 0.5 || dist(boot, ball.pos) > SLIDE.contact) return;
  // A loose ball is poked on in the slide's direction.
  a.slideDone = true;
  const kick = 6.5 + 2.5 * a.strength;
  ball.vel = { x: a.actionDir.x * kick, y: 0.8, z: a.actionDir.z * kick };
  ball.lastTouch = { team: a.team, id: a.id };
  ball.passTo = null;
  a.noTouch = 0.5;
  state.events.push({ type: "tackle", athlete: a.id, victim: null, won: true });
}

/**
 * The tackle itself. Strength against strength, the dribbler's close
 * control, and the angle (from behind is hardest) set the chance. Won,
 * the ball squirts loose and the dribbler goes down. Lost, the dribbler
 * hops over the sliding boot and carries on.
 */
function resolve(state: MatchState, a: Athlete, victim: Athlete): void {
  a.slideDone = true;
  const fromBehind = Math.max(0, dot(a.actionDir, fromAngle(victim.facing)));
  const chance = clamp(0.62 + 0.4 * (a.strength - victim.strength) - 0.35 * (victim.dribbling - 0.75) - 0.15 * fromBehind, 0.2, 0.9);
  const ball = state.ball;
  if (state.rng.chance(chance)) {
    const side = state.rng.range(-1, 1) * 2;
    const kick = 5 + 3 * a.strength;
    ball.owner = null;
    ball.vel = { x: a.actionDir.x * kick - a.actionDir.z * side, y: 1.1, z: a.actionDir.z * kick + a.actionDir.x * side };
    ball.lastTouch = { team: a.team, id: a.id };
    ball.passTo = null;
    knockDown(state, victim);
    a.stats.tackles++;
    state.events.push({ type: "tackle", athlete: a.id, victim: victim.id, won: true });
  } else {
    victim.action = "hurdle";
    victim.actionT = 0;
    victim.actionLen = SLIDE.hurdle;
    state.events.push({ type: "tackle", athlete: a.id, victim: victim.id, won: false });
  }
}

function knockDown(state: MatchState, victim: Athlete): void {
  victim.action = "stumble";
  victim.actionT = 0;
  victim.actionLen = SLIDE.stumble;
  victim.charging = false;
  victim.charge = 0;
  victim.noTouch = SLIDE.stumble * 0.6;
  state.events.push({ type: "stumble", athlete: victim.id });
}

/**
 * Standing challenges: a defender right at the dribbler's feet may nick
 * the ball away. Strength and close control hold them off, and a player
 * who has only just taken the ball cannot be robbed on the spot.
 */
export function challenges(state: MatchState, dt: number): void {
  const ball = state.ball;
  if (ball.owner?.kind !== "athlete" || ball.heldFor < 0.45) return;
  const carrier = state.athletes[ball.owner.id];
  // Mid skill move the ball is tested once, in skills.ts, not nicked step by step.
  if (!carrier || carrier.action === "hurdle" || carrier.action === "skill") return;
  for (const o of state.athletes) {
    if (o.team === carrier.team || o.action !== "free" || o.noTouch > 0) continue;
    if (dist(footPoint(o), ball.pos) > 0.55) continue;
    const rate = 1.3 * clamp(0.5 + 0.8 * o.strength - 0.5 * carrier.strength - 0.35 * carrier.dribbling, 0.08, 1);
    if (!state.rng.chance(rate * dt)) continue;
    const away = norm({ x: ball.pos.x - o.pos.x, z: ball.pos.z - o.pos.z });
    ball.owner = null;
    ball.vel = { x: away.x * 2.5 + o.vel.x * 0.4, y: 0, z: away.z * 2.5 + o.vel.z * 0.4 };
    ball.lastTouch = { team: o.team, id: o.id };
    carrier.noTouch = 0.45;
    o.stats.tackles++;
    state.events.push({ type: "tackle", athlete: o.id, victim: carrier.id, won: true });
    return;
  }
}
