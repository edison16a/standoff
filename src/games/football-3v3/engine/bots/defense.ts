import { topSpeed } from "../body";
import { meetPoint } from "../catch/path";
import { ballTrack } from "../catch/track";
import { pressRush } from "../rush-shed";
import { FIELD, YARD, yardToX } from "../field";
import type { Match } from "../match";
import { pressTackle } from "../tackle";
import { TACKLE } from "../tuning";
import type { Athlete } from "../types";
import { clamp, dist2 } from "../vec";
import { ahead, headFor } from "./goal";
import type { FootballSkill } from "./skill";

/**
 * Once a pass is up, a defender reads it and breaks for where he can get
 * to it: the one who jumped the route goes for the ball itself, the rest
 * for where it comes down.
 */
export function breakOnBall(m: Match, a: Athlete): boolean {
  const pass = m.ball.pass;
  if (m.ball.state !== "pass" || !pass) return false;
  const track = ballTrack(m, a);
  if (track) a.bot.goal = track;
  else {
    const meet = pass.path ? meetPoint(pass.path, m.time, a, topSpeed(a, false), 0.5) : null;
    headFor(a, meet?.spot ?? pass.spot, 0.5);
  }
  return true;
}

/** A loose ball: everyone goes after it, to where it is heading. */
export function chaseLoose(m: Match, a: Athlete): void {
  const f = m.ball.flight;
  const p = m.ball.pos;
  headFor(a, f ? { x: p.x + f.vel.x * 0.25, z: p.z + f.vel.z * 0.25 } : p, 0.3);
}

/**
 * Chases the ball carrier to where they are heading and tackles when in
 * reach. Easier bots hesitate and whiff more.
 */
export function pursue(m: Match, a: Athlete, carrier: Athlete, skill: FootballSkill): void {
  const d = dist2(a, carrier);
  headFor(a, ahead(carrier, clamp(d / 8, 0, 1.2)), 0.3);
  if (d < TACKLE.range * 0.7 && a.action.kind === "none" && a.tackleCd <= 0 && m.rng.chance(skill.tackle)) {
    pressTackle(m, a, carrier);
  }
}

/**
 * How a man defender reads his receiver. He looks `base` seconds down
 * the route plus `perReaction` of his reaction time: a bot holds each
 * move until it next thinks, so a slower one has to aim further ahead to
 * still be on the route when the ball comes. He gives the receiver
 * `cushion` of his level's cushion, playing tight and trusting the read.
 */
const READ = { base: 0.1, perReaction: 0.95, cushion: 0.5 } as const;

/** The read the showcase's game was filmed with (Match.filmed): a fixed glance ahead and the full cushion. */
const FILMED_READ = { base: 0.3, perReaction: 0, cushion: 1 } as const;

/**
 * Man coverage from over the top: the bot shadows where its receiver's
 * route takes him next, a step deeper, toward the end zone it defends.
 * Playing deep means it is never sat in front of the receiver, so it is
 * not the one picking passes off.
 */
export function cover(m: Match, a: Athlete, skill: FootballSkill): void {
  if (breakOnBall(m, a)) return;
  const r = a.bot.cover === null ? null : m.athlete(a.bot.cover);
  if (!r) return rushQb(m, a, skill);
  const read = m.filmed ? FILMED_READ : READ;
  const spot = ahead(r, read.base + skill.reaction * read.perReaction);
  // Over the top stops at the end line: past it he would only shove his man out of the back of the end zone.
  const x = clamp(spot.x + m.sign * skill.cushion * read.cushion, -(FIELD.endX - 0.5), FIELD.endX - 0.5);
  headFor(a, { x, z: spot.z - Math.sign(spot.z) * 0.5 }, 0.6);
}

/** The deep safety: fourteen yards off the line in the middle, drifting toward the ball, until it is thrown. */
export function safety(m: Match, a: Athlete): void {
  if (breakOnBall(m, a)) return;
  const losX = yardToX(m.offense, m.drive.los);
  const deep = clamp(losX + m.sign * 14 * YARD, -(FIELD.endX - 1), FIELD.endX - 1);
  headFor(a, { x: deep, z: m.ball.pos.z * 0.5 }, 1);
}

/** The spare defender waits a beat after the snap, then rushes the QB through the line. */
export function rushQb(m: Match, a: Athlete, skill: FootballSkill): void {
  if (breakOnBall(m, a)) return;
  const qb = m.qbOf(m.offense);
  if ((m.play?.sinceSnap ?? 0) < skill.reaction) return headFor(a, a, 1);
  if (a.rushCd <= 0 && a.blocked > 0) pressRush(m, a);
  if (m.carrier() === qb) return pursue(m, a, qb, skill);
  headFor(a, qb, 0.5);
}
