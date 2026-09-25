import { attackSign, other } from "../teams";
import { goalX } from "./goal";
import { choosePassTarget, leadFor } from "./passing";
import { ASSIST, PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { angleDiff, angleOf, clamp, dot, len, norm, sub, type Vec2 } from "./vec";

/**
 * What a tap of Shoot/Pass turns into. The player only points the
 * stick; the game picks between a pass to a team mate and a ball into
 * space, and between a ground pass and a lofted one. A shot is a hold,
 * see buttons.ts.
 */
export type KickPlan =
  | { kind: "shot"; aimZ: number | null }
  | { kind: "pass"; to: number; air: boolean }
  | { kind: "space"; dir: Vec2; air: boolean };

/**
 * Reads the stick like a person would. Pointing roughly at a team mate
 * passes to them, anywhere else plays the ball into space that way.
 * With the stick centred it finds the best pass, or plays it on ahead.
 */
export function planPass(state: MatchState, a: Athlete, stick: Vec2 | null): KickPlan {
  const pushed = stick && len(stick) > ASSIST.deadZone ? norm(stick) : null;
  const from = { x: a.pos.x, y: 0, z: a.pos.z };
  if (!pushed) {
    const mate = choosePassTarget(state, a, null);
    if (mate) return { kind: "pass", to: mate.id, air: needsAir(state, a, leadFor(from, mate)) };
    return space(state, a, { x: attackSign(a.team), z: 0 });
  }
  const mate = mateInCone(state, a, angleOf(pushed));
  if (mate) return { kind: "pass", to: mate.athlete.id, air: needsAir(state, a, leadFor(from, mate.athlete)) };
  return space(state, a, pushed);
}

function space(state: MatchState, a: Athlete, dir: Vec2): KickPlan {
  const into = { x: a.pos.x + dir.x * ASSIST.spaceLength, z: a.pos.z + dir.z * ASSIST.spaceLength };
  return { kind: "space", dir, air: needsAir(state, a, into) };
}

/**
 * Where on the goal line a held shot goes. Pointing toward goal aims
 * along the stick; pointing up or down the screen picks the far or the
 * near side; centred leaves it to the game.
 */
export function shotAimZ(a: Athlete, stick: Vec2): number | null {
  if (len(stick) < ASSIST.deadZone) return null;
  const dir = norm(stick);
  if (dir.x * attackSign(a.team) > 0.2) return aimOnLine(a, other(a.team), dir);
  if (Math.abs(dir.z) > 0.5) return Math.sign(dir.z) * (PITCH.goalHalfWidth - 0.5);
  return null;
}

/** The team mate closest to where the stick points, within the cone. */
function mateInCone(state: MatchState, a: Athlete, aim: number): { athlete: Athlete; off: number } | null {
  let best: { athlete: Athlete; off: number } | null = null;
  let bestScore = Infinity;
  for (const m of state.athletes) {
    if (m.team !== a.team || m.id === a.id) continue;
    const to = sub(m.pos, a.pos);
    const d = len(to);
    if (d < 1.5 || d > ASSIST.passReach) continue;
    const off = Math.abs(angleDiff(aim, angleOf(to)));
    if (off > ASSIST.mateCone) continue;
    // The angle matters most, the distance breaks ties.
    const score = off + d * 0.012;
    if (score < bestScore) {
      bestScore = score;
      best = { athlete: m, off };
    }
  }
  return best;
}

/** Where on the goal line the stick points, kept between the posts. */
function aimOnLine(a: Athlete, foe: 0 | 1, dir: Vec2): number {
  const gx = goalX(foe);
  const along = Math.abs(dir.x) > 0.05 ? (gx - a.pos.x) / dir.x : 0;
  const z = along > 0 ? a.pos.z + dir.z * along : a.pos.z;
  return clamp(z, -PITCH.goalHalfWidth, PITCH.goalHalfWidth);
}

/**
 * A long ball, or one with a defender standing in its path, is lofted
 * over the top. Anything else goes along the ground, which is quicker
 * and easier to control.
 */
export function needsAir(state: MatchState, a: Athlete, to: Vec2): boolean {
  const lane = sub(to, a.pos);
  const length = len(lane);
  if (length > ASSIST.airLength) return true;
  if (length < 4) return false;
  const dir = norm(lane);
  for (const o of state.athletes) {
    if (o.team === a.team) continue;
    const rel = sub(o.pos, a.pos);
    const along = dot(rel, dir);
    if (along < 1.2 || along > length - 1) continue;
    const across = Math.abs(rel.x * dir.z - rel.z * dir.x);
    if (across < ASSIST.laneWidth) return true;
  }
  // A keeper off the line can cut out a ground ball across the box too.
  for (const k of state.keepers) {
    if (k.team === a.team) continue;
    const rel = sub(k.pos, a.pos);
    const along = dot(rel, dir);
    if (along > 1.2 && along < length - 1 && Math.abs(rel.x * dir.z - rel.z * dir.x) < ASSIST.laneWidth) return true;
  }
  return false;
}
