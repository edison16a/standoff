import { airborne, buildOf, standingReach } from "./athlete";
import { blockTiming } from "./block";
import { contestScale, interceptChance } from "./build-effects";
import { extraReach } from "./contest";
import type { Match } from "./match";
import type { BallBody } from "./physics/air";
import { BALL } from "./physics/ball-spec";
import type { TouchHook } from "./physics/world";
import { between } from "./rng";
import { gainPossession, missShot } from "./rules";
import { PASS, RIM } from "./tuning";
import type { Athlete } from "./types";
import { clamp } from "./vec";

/**
 * The hands on a ball in the air. A defender in the air can get a hand
 * on a shot only where his arm really reaches, from the shoulder, and
 * only once: the timing of his jump and his reach decide whether he
 * gets it, and then the swat is a real hit that sends the ball off. A
 * pass is caught when it comes to the receiver's hands, or picked off
 * by a defender it passes. A loose ball goes to whoever reaches it.
 */

/** Where the shoulder is and how far the arm reaches from it. */
function arm(a: Athlete): { x: number; y: number; z: number; reach: number } {
  const h = buildOf(a).body.height;
  const shoulder = a.y + h * 0.81;
  return { x: a.x, y: shoulder, z: a.z, reach: a.y + standingReach(a) - shoulder + 0.06 };
}

/** The chance a hand that gets there blocks it: the timing of the jump, the length of the arms and the defence rating. */
function touchChance(d: Athlete, kind: "jumper" | "layup"): number {
  const long = extraReach(d);
  const base = kind === "jumper" ? 0.19 + long * 0.25 : 0.3 + long * 0.25;
  return clamp(base * (0.3 + 0.7 * blockTiming(d)) * contestScale(buildOf(d).stats.defence), 0.03, 0.62);
}

/** For a shot in the air with defenders up: checks every small step whether a hand gets to it. */
export function blockHook(m: Match): TouchHook | undefined {
  const b = m.ball;
  const shot = b.shot;
  if (b.mode !== "flight" || b.flightKind !== "shot" || !shot || shot.kind === "free" || shot.kind === "dunk") return undefined;
  const up = m.opponents(shot.team).filter((d) => d.action.kind === "block" && airborne(d) && !shot.rolled.includes(d.id));
  if (!up.length) return undefined;
  const kind = shot.kind === "jumper" ? "jumper" : "layup";
  return (body) => {
    if (b.flightKind !== "shot") return;
    // Touching a ball on its way down above the ring is goaltending, and nobody tries it.
    if (body.vel.y < 0 && body.pos.y > RIM.y && Math.hypot(body.pos.x - RIM.x, body.pos.z - RIM.z) < 0.7) return;
    for (const d of up) {
      if (shot.rolled.includes(d.id)) continue;
      const s = arm(d);
      if (body.pos.y < s.y || Math.hypot(body.pos.x - s.x, body.pos.y - s.y, body.pos.z - s.z) > s.reach + BALL.radius) continue;
      shot.rolled.push(d.id);
      if (m.rng() >= touchChance(d, kind)) continue;
      swat(m, body);
      d.box.blocks++;
      b.lastTouch = d.id;
      b.flightKind = "block";
      shot.outcome = "airball";
      m.emit({ type: "block", id: d.id, victim: shot.shooter });
      missShot(m);
      return;
    }
  };
}

/**
 * The swat: the hand comes through the ball, back the way it came and
 * off to a side or down, and the ball bounces off the moving hand like
 * any hit, keeping a little of its own speed reversed.
 */
export function swat(m: Match, body: BallBody): void {
  const away = { x: body.pos.x - RIM.x, z: body.pos.z - RIM.z };
  const l = Math.hypot(away.x, away.z) || 1;
  const side = between(m.rng, -0.8, 0.8);
  const speed = between(m.rng, 1.5, 3.8);
  const hand = { x: ((away.x - side * away.z) / l) * speed, y: between(m.rng, -1.8, 1.4), z: ((away.z + side * away.x) / l) * speed };
  const v = body.vel;
  const e = 0.2;
  body.vel = { x: hand.x + (hand.x - v.x) * e, y: hand.y + (hand.y - v.y) * e, z: hand.z + (hand.z - v.z) * e };
  body.w = { x: body.w.x * 0.3 + between(m.rng, -12, 12), y: between(m.rng, -6, 6), z: body.w.z * 0.3 + between(m.rng, -12, 12) };
}

/** A pass is caught when it reaches the receiver's hands, or picked off by a defender it passes close to. */
export function passCaught(m: Match): boolean {
  const b = m.ball;
  const receiver = b.passTo === null ? null : m.athletes[b.passTo];
  if (receiver && receiver.action.kind !== "drive" && inHands(receiver, b.pos, 0.62)) {
    gainPossession(m, receiver);
    receiver.dribble = 0;
    m.emit({ type: "catch", id: receiver.id });
    return true;
  }
  if (b.flightT < 0.08 || !receiver) return false;
  for (const d of m.opponents(receiver.team)) {
    if (b.passRolled.includes(d.id)) continue;
    if (Math.hypot(b.pos.x - d.x, b.pos.z - d.z) > PASS.interceptRange || b.pos.y > standingReach(d) + d.y - 0.15) continue;
    b.passRolled.push(d.id);
    const passer = b.lastTouch ?? receiver.id;
    if (d.action.kind !== "none" || m.rng() >= interceptChance(buildOf(d).stats, buildOf(m.athletes[passer] ?? receiver).stats)) continue;
    // Most are clean picks; some only get a finger on it and knock it loose.
    if (m.rng() < 0.3) {
      tip(m, d);
      return true;
    }
    gainPossession(m, d);
    d.box.steals++;
    m.emit({ type: "intercept", id: d.id, victim: passer });
    return true;
  }
  return false;
}

/** A fingertip on a pass: the ball slows and flies off at an angle, loose. */
function tip(m: Match, d: Athlete): void {
  const b = m.ball;
  const side = between(m.rng, -1, 1);
  b.vel = { x: b.vel.x * 0.35 + side * 2, y: Math.abs(b.vel.y) * 0.3 + between(m.rng, 0.5, 2), z: b.vel.z * 0.35 - side * 2 };
  b.w = { x: between(m.rng, -15, 15), y: between(m.rng, -8, 8), z: between(m.rng, -15, 15) };
  b.mode = "loose";
  b.flightKind = null;
  b.passTo = null;
  b.aim = null;
  b.lastTouch = d.id;
}

/** Whether the ball is where this player's hands can take it: in front of the body between the knees and full stretch. */
function inHands(a: Athlete, p: { x: number; y: number; z: number }, reach: number): boolean {
  const top = a.y + standingReach(a) + (a.action.kind === "block" ? 0.1 : 0);
  return Math.hypot(p.x - a.x, p.z - a.z) < reach && p.y > a.y + 0.35 && p.y < top;
}

/** The nearest player who can reach a loose ball takes it. Jumping reaches higher and a little wider. */
export function grab(m: Match): void {
  const b = m.ball;
  let best: Athlete | null = null;
  let bestD = Infinity;
  for (const a of m.athletes) {
    const k = a.action.kind;
    if (a.grabCd > 0 || k === "shoot" || k === "drive" || k === "stumble") continue;
    const d = Math.hypot(b.pos.x - a.x, b.pos.z - a.z);
    const jumping = k === "block";
    if (d > (jumping ? 0.8 : 0.58) || b.pos.y > standingReach(a) + a.y + (jumping ? 0.1 : 0)) continue;
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  if (!best) return;
  gainPossession(m, best);
  best.dribble = 0;
}
