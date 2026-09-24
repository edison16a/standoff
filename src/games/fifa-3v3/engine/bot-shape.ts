import { attackSign, other } from "../teams";
import { goalX } from "./goal";
import { PITCH } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, lerp, norm, sub, type Vec2 } from "./vec";

const HL = PITCH.halfLength;
const HW = PITCH.halfWidth;

function onPitch(p: Vec2, margin = 1.2): Vec2 {
  return { x: clamp(p.x, -HL + margin, HL - margin), z: clamp(p.z, -HW + margin, HW - margin) };
}

/** Team mates of `a`, in id order, so roles are handed out the same way every time. */
function mates(state: MatchState, a: Athlete): Athlete[] {
  return state.athletes.filter((m) => m.team === a.team && m.id !== a.id);
}

/**
 * The team's resting shape, which slides with the ball: one up front
 * and two either side behind, all pulled toward the ball's side.
 */
export function shapeSpot(state: MatchState, a: Athlete): Vec2 {
  const s = attackSign(a.team);
  const b = state.ball.pos;
  const own = goalX(a.team);
  if (a.slot === 0) return onPitch({ x: lerp(b.x, s * 2, 0.35) + s * 1.5, z: b.z * 0.45 });
  const side = a.slot === 1 ? -1 : 1;
  const x = lerp(own + s * 6.5, b.x, 0.5);
  return onPitch({ x, z: side * 4.6 + b.z * 0.3 });
}

/**
 * Where to go while a team mate has the ball: the first of the other
 * two makes a run into the space ahead on the far side, the second
 * stays back as an outlet. Nobody stands on top of the dribbler.
 */
export function supportSpot(state: MatchState, a: Athlete, carrier: Athlete): Vec2 {
  const s = attackSign(a.team);
  const others = mates(state, a).filter((m) => m.id !== carrier.id);
  const runner = others.every((m) => m.id > a.id);
  const lane = carrier.pos.z > 0 ? -1 : 1;
  const spot = runner
    ? { x: carrier.pos.x + s * 6, z: lane * 4.5 }
    : { x: carrier.pos.x - s * 4, z: -lane * 2 + carrier.pos.z * 0.2 };
  // Stay out of the keeper's area and onside of the goal line.
  spot.x = clamp(spot.x, -HL + 3, HL - 3);
  return onPitch(spot);
}

/** Spread wide to receive the keeper's throw. */
export function throwSpot(a: Athlete): Vec2 {
  const s = attackSign(a.team);
  const own = goalX(a.team);
  if (a.slot === 0) return { x: own + s * 13, z: 0 };
  return { x: own + s * 6, z: (a.slot === 1 ? -1 : 1) * 6.5 };
}

/**
 * Goal side of an opponent: between them and our goal, close enough to
 * cut out a pass to them.
 */
export function markSpot(a: Athlete, opponent: Athlete, gap: number): Vec2 {
  const goal = { x: goalX(a.team), z: 0 };
  const toGoal = norm(sub(goal, opponent.pos));
  return onPitch({ x: opponent.pos.x + toGoal.x * gap, z: opponent.pos.z + toGoal.z * gap }, 0.6);
}

/** The opponent this player should mark: the nearest one not already covered by a team mate. */
export function markTarget(state: MatchState, a: Athlete, carrier: Athlete | null): Athlete | null {
  const foes = state.athletes.filter((o) => o.team === other(a.team) && o.id !== carrier?.id);
  const taken = new Set<number>();
  for (const m of mates(state, a)) {
    if (m.id > a.id) continue;
    let near: Athlete | null = null;
    for (const f of foes) if (!taken.has(f.id) && (!near || dist(f.pos, m.pos) < dist(near.pos, m.pos))) near = f;
    if (near) taken.add(near.id);
  }
  let best: Athlete | null = null;
  for (const f of foes) if (!taken.has(f.id) && (!best || dist(f.pos, a.pos) < dist(best.pos, a.pos))) best = f;
  return best ?? foes[0] ?? null;
}

/** Whether `a` is the closest of its team to a spot, counting phones' players too. */
export function closestOfTeam(state: MatchState, a: Athlete, spot: Vec2): boolean {
  const mine = dist(a.pos, spot);
  return state.athletes.every((m) => m.team !== a.team || m.id === a.id || dist(m.pos, spot) >= mine - 0.05);
}
