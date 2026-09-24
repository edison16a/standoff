import { other } from "../teams";
import { goalX, shotAngle, toGoal } from "./goal";
import { choosePassTarget, leadFor } from "./passing";
import { ASSIST, PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { angleDiff, angleOf, clamp, dot, len, norm, sub, type Vec2 } from "./vec";

/**
 * What one press of Shoot turns into. The player only points the stick;
 * the game decides between a shot, a pass to a team mate and a pass into
 * space, and between a ground pass and a lofted one.
 */
export type KickPlan =
  | { kind: "shot"; aimZ: number | null }
  | { kind: "pass"; to: number; air: boolean }
  | { kind: "space"; dir: Vec2; air: boolean };

/**
 * Reads the stick like a person would. Pointing roughly at a team mate
 * passes to them, roughly at goal shoots toward that part of it, and
 * anywhere else plays the ball into space that way. With the stick
 * centred it shoots when in range and otherwise finds the best pass.
 */
export function planKick(state: MatchState, a: Athlete, stick: Vec2 | null): KickPlan {
  const foe = other(a.team);
  const d = toGoal(a.pos, foe);
  const pushed = stick && len(stick) > ASSIST.deadZone ? norm(stick) : null;
  if (!pushed) {
    if (d < ASSIST.autoRange && shotAngle(a.pos, foe) < 1.2) return { kind: "shot", aimZ: null };
    const mate = choosePassTarget(state, a, null);
    if (mate) return { kind: "pass", to: mate.id, air: needsAir(state, a, mate.pos) };
    return { kind: "shot", aimZ: null };
  }
  const aim = angleOf(pushed);
  const goalOff = goalAngleOff(a, foe, aim);
  const mate = mateInCone(state, a, aim);
  const goalLooks = d < ASSIST.shootRange && goalOff !== null;
  // Both look likely: whichever the stick points at more closely wins,
  // with the goal favoured close in, where a pass is rarely wanted.
  if (goalLooks && (!mate || goalOff! < mate.off + (d < 10 ? 0.25 : 0))) return { kind: "shot", aimZ: aimOnLine(a, foe, pushed) };
  if (mate) return { kind: "pass", to: mate.athlete.id, air: needsAir(state, a, leadFor({ x: a.pos.x, y: 0, z: a.pos.z }, mate.athlete)) };
  const into = { x: a.pos.x + pushed.x * ASSIST.spaceLength, z: a.pos.z + pushed.z * ASSIST.spaceLength };
  return { kind: "space", dir: pushed, air: needsAir(state, a, into) };
}

/** How far the stick is off the goal, or null when it is not pointing at it at all. */
function goalAngleOff(a: Athlete, foe: 0 | 1, aim: number): number | null {
  const gx = goalX(foe);
  const toPost = (z: number) => angleOf(sub({ x: gx, z }, a.pos));
  const near = toPost(-PITCH.goalHalfWidth);
  const far = toPost(PITCH.goalHalfWidth);
  const middle = angleOf(sub({ x: gx, z: 0 }, a.pos));
  // The window is the goal mouth itself, widened a little each side.
  const half = Math.abs(angleDiff(near, far)) / 2 + ASSIST.goalSlack;
  const off = Math.abs(angleDiff(aim, middle));
  return off <= half ? off : null;
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
