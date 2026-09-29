import { attackSign } from "../teams";
import { statsOf } from "./body";
import { kickLeg } from "./build-effects";
import { newDrive, type Drive } from "./downs";
import type { PlayEnd } from "./events";
import { FIELD, POSTS, spotZ, xToYard, YARD } from "./field";
import { launch, stepFlight, type Flight } from "./flight";
import type { KickState } from "./kick";
import type { Match } from "./match";
import { addScore } from "./score";
import { BALL, KICK, RULES } from "./tuning";
import type { Athlete } from "./types";
import { lerp, type V3 } from "./vec";
import { afterScore } from "./whistle";

const inGreen = (aim: number) => Math.abs(aim) <= KICK.green;

/** The kick off the foot: power sets the speed, the accuracy marker how far it hooks off line. */
export function kickFlight(from: V3, sign: 1 | -1, fieldGoal: boolean, power: number, aim: number, leg: number): Flight {
  const speed = lerp(KICK.minSpeed, KICK.maxSpeed, power) * (0.88 + leg * 0.024);
  const toPosts = Math.atan2(0 - from.z, sign * POSTS.x - from.x);
  const straight = fieldGoal ? toPosts : sign > 0 ? 0 : Math.PI;
  const off = aim * (inGreen(aim) ? 0.04 : KICK.spray);
  // Positive aim is to the kicker's right (forward cross up), which is +angle here whichever way they face.
  const heading = straight + off;
  const el = fieldGoal ? KICK.fgAngle : KICK.puntAngle;
  const vel = { x: Math.cos(heading) * Math.cos(el) * speed, y: Math.sin(el) * speed, z: Math.sin(heading) * Math.cos(el) * speed };
  return fieldGoal ? launch(from, vel, "tumble", 13, 0) : launch(from, vel, "spiral", 40, 0.1);
}

/** Good once it crosses the goal line of the posts between the uprights and over the bar. */
export function judgeFieldGoal(f: Flight, sign: 1 | -1): "good" | "miss" | null {
  if (sign * f.pos.x >= POSTS.x) return Math.abs(f.pos.z) <= POSTS.halfGap && f.pos.y >= POSTS.crossbar ? "good" : "miss";
  if (f.pos.y <= 0) return "miss";
  return null;
}

const kickFrom = (kicker: Athlete, sign: 1 | -1): V3 => ({ x: kicker.x + sign * 0.6, y: 0.2, z: kicker.z });

/** The least power that makes a straight kick good, plus a margin: what a computer kicker aims for. */
export function bestFieldGoalPower(m: Match, kicker: Athlete): number {
  const sign = attackSign(kicker.team);
  const leg = kickLeg(statsOf(kicker));
  for (let p = 0.3; p <= 1.001; p += 0.05) {
    const f = kickFlight(kickFrom(kicker, sign), sign, true, p, 0, leg);
    let verdict: "good" | "miss" | null = null;
    for (let i = 0; i < 900 && verdict === null; i++) {
      stepFlight(f, 1 / 120);
      verdict = judgeFieldGoal(f, sign);
    }
    if (verdict === "good") return Math.min(1, p + 0.08);
  }
  return 1;
}

export function launchKick(m: Match, k: KickState, kicker: Athlete, leg: number): void {
  const sign = attackSign(kicker.team);
  m.ball.state = "kick";
  m.ball.holder = null;
  m.ball.flight = kickFlight(kickFrom(kicker, sign), sign, k.fieldGoal, k.power ?? 0.5, k.aim ?? 0, leg);
  m.emit({ type: "kick", id: kicker.id, fieldGoal: k.fieldGoal, power: k.power ?? 0.5, accuracy: k.aim ?? 0 });
}

function finish(m: Match, k: KickState, end: PlayEnd, next: Drive): void {
  k.stage = "done";
  m.lastEnd = end;
  m.nextDrive = next;
  m.phase = "dead";
  m.phaseT = 0;
  m.emit({ type: "whistle", end, yards: 0 });
}

function fieldGoalResult(m: Match, k: KickState, good: boolean): void {
  const d = m.drive;
  const yards = Math.round(100 - d.los + RULES.fgDepth + 10);
  m.emit({ type: "fieldGoal", team: d.offense, good, conversion: k.conversion, yards });
  if (good) {
    if (!k.conversion) m.athlete(k.kicker)!.stats.fieldGoals++;
    addScore(m, d.offense, k.conversion ? 1 : 3);
    return finish(m, k, "fieldGoal", afterScore(m, d.offense));
  }
  // A miss gives the ball back at the line; a missed try just moves on to the kickoff.
  finish(m, k, "missedKick", k.conversion ? afterScore(m, d.offense) : newDrive(m.defense, 100 - d.los, d.ballZ));
}

/** Where a punt comes to rest, after a few bounces, and who gets it there. */
function puntResult(m: Match, k: KickState, f: Flight): void {
  const receiving = m.defense;
  const yl = xToYard(receiving, f.pos.x);
  const kicked = Math.round(100 - yl - m.drive.los);
  m.emit({ type: "punt", team: m.offense, yards: kicked });
  const next = yl <= 0 ? newDrive(receiving, RULES.touchback) : newDrive(receiving, yl, spotZ(f.pos.z));
  finish(m, k, "punt", next);
}

export function updateKickFlight(m: Match, k: KickState, dt: number): void {
  const f = m.ball.flight;
  if (!f) return;
  stepFlight(f, dt);
  m.ball.pos = { ...f.pos };
  const sign = attackSign(m.offense);
  if (k.fieldGoal) {
    const verdict = judgeFieldGoal(f, sign);
    if (verdict) fieldGoalResult(m, k, verdict === "good");
    return;
  }
  const out = Math.abs(f.pos.z) > FIELD.halfWidth || Math.abs(f.pos.x) > FIELD.endX;
  if (out) return puntResult(m, k, f);
  if (f.pos.y > 0) return;
  // A bounce: the ball kicks up off the turf, losing most of its pace.
  f.pos.y = 0;
  f.vel.y = -f.vel.y * BALL.restitution;
  f.vel.x *= BALL.groundFriction;
  f.vel.z *= BALL.groundFriction;
  f.spin *= 0.5;
  k.bounces++;
  if (Math.hypot(f.vel.x, f.vel.y, f.vel.z) < 1.5 || k.bounces >= 4) puntResult(m, k, f);
}

/** How far a punt at this power carries in the air, in yards, for tests and bots. */
export function puntCarry(power: number, leg: number): number {
  const f = kickFlight({ x: 0, y: 0.2, z: 0 }, 1, false, power, 0, leg);
  while (f.pos.y > 0) stepFlight(f, 1 / 120);
  return f.pos.x / YARD;
}
