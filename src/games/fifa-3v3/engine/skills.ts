import { attackSign } from "../teams";
import { brake, integrate, topSpeed, turnToward } from "./athlete";
import { owns } from "./kick";
import { ballOffset, moveFacing, moveVelocity, MOVES, type MoveFrame } from "./skill-moves";
import { BALL, MOVE, PITCH } from "./tuning";
import type { Athlete, MatchState, SkillKind } from "./types";
import { angleOf, clamp, dist, dot, fromAngle, len, norm, sub, type Vec2 } from "./vec";

export const SKILL = {
  /** Less stick than this is a roulette. */
  deadZone: 0.35,
  /** How far the stick must lean toward or away from goal to be forward or back. */
  forward: 0.6,
  /** Dribbling at or above this turns a side move into an elastico. */
  elastico: 0.9,
  cooldown: 0.35,
  heatDecay: 0.6,
  /** The furthest a defender can be and still be taken on. */
  reach: 2.6,
  /** A beaten defender staggers this long. */
  lag: 0.65,
  /** How hard a beaten defender lunges the wrong way, which also opens the lane past them. */
  lunge: 4,
  risk: 0.05,
} as const;

/** Which move the stick asks for, against the goal the player attacks. */
export function pickSkill(a: Athlete, stick: Vec2): { kind: SkillKind; exit: Vec2 } {
  const facing = fromAngle(a.facing);
  if (len(stick) < SKILL.deadZone) return { kind: "roulette", exit: facing };
  const exit = norm(stick);
  const toward = exit.x * attackSign(a.team);
  if (toward > SKILL.forward) return { kind: "rainbow", exit };
  if (toward < -SKILL.forward) return { kind: "dragback", exit };
  return { kind: a.dribbling >= SKILL.elastico ? "elastico" : "crossover", exit };
}

/** Starts a skill move the way the stick points. Only with the ball, on the feet, off cooldown. */
export function startSkill(state: MatchState, a: Athlete, stick: Vec2): boolean {
  const sk = a.skill;
  if (sk.wait > 0 || a.action !== "free" || !owns(state, a)) return false;
  const { kind, exit } = pickSkill(a, stick);
  const from = fromAngle(a.facing);
  const cross = from.x * exit.z - from.z * exit.x;
  // A roulette spins away from the nearest defender; the others go the way they are pushed.
  const side = kind === "roulette" ? spinSide(state, a, from) : cross >= 0 ? 1 : -1;
  a.action = "skill";
  a.actionT = 0;
  a.actionLen = MOVES[kind].length;
  a.actionDir = exit;
  a.charging = false;
  a.charge = 0;
  Object.assign(sk, { kind, exit, from, side, pace: len(a.vel), tested: false, heat: sk.heat + 1 });
  state.events.push({ type: "skill", athlete: a.id, kind });
  return true;
}

function spinSide(state: MatchState, a: Athlete, from: Vec2): 1 | -1 {
  const foe = nearestFoe(state, a);
  if (!foe) return state.rng.chance(0.5) ? 1 : -1;
  const to = sub(foe.pos, a.pos);
  return from.x * to.z - from.z * to.x > 0 ? -1 : 1;
}

function frame(a: Athlete): MoveFrame {
  const sk = a.skill;
  const top = topSpeed(a) * (MOVE.withBall + 0.1 * a.dribbling);
  return { kind: sk.kind ?? "roulette", from: sk.from, exit: sk.exit, side: sk.side, pace: sk.pace, top };
}

/** One step of a move: the scripted run and turn, the ball at the feet, and the defender tested once. */
export function updateSkill(state: MatchState, a: Athlete, dt: number): void {
  const f = frame(a);
  const u = clamp(a.actionT / a.actionLen, 0, 1);
  const want = moveVelocity(f, u);
  const k = 1 - Math.exp(-dt * 18);
  a.vel.x += (want.x - a.vel.x) * k;
  a.vel.z += (want.z - a.vel.z) * k;
  integrate(a, dt);
  a.facing = moveFacing(f, u);
  if (!owns(state, a)) {
    a.action = "free";
    return;
  }
  placeBall(state, a, f, u, dt);
  if (!a.skill.tested && u >= MOVES[f.kind].beat) testDefender(state, a);
  if (a.actionT >= a.actionLen) {
    a.action = "free";
    a.actionT = 0;
    a.facing = angleOf(f.kind === "roulette" ? f.from : f.exit);
    a.skill.kind = null;
    a.skill.wait = SKILL.cooldown;
  }
}

/** Eases the ball to its scripted spot, so it joins the move from the dribble without a jump. */
function placeBall(state: MatchState, a: Athlete, f: MoveFrame, u: number, dt: number): void {
  const ball = state.ball;
  const off = ballOffset(f, u);
  const k = 1 - Math.exp(-dt * 35);
  // Carried with the body before easing, so the ball keeps to the script at pace instead of trailing it.
  const bx = ball.pos.x + a.vel.x * dt;
  const bz = ball.pos.z + a.vel.z * dt;
  const x = clamp(bx + (a.pos.x + off.x - bx) * k, -PITCH.halfLength + 0.2, PITCH.halfLength - 0.2);
  const z = clamp(bz + (a.pos.z + off.z - bz) * k, -PITCH.halfWidth + BALL.radius, PITCH.halfWidth - BALL.radius);
  const y = ball.pos.y + (off.y - ball.pos.y) * k;
  ball.vel = { x: (x - ball.pos.x) / dt, y: (y - ball.pos.y) / dt, z: (z - ball.pos.z) / dt };
  ball.pos = { x, y, z };
  ball.spin = { x: 0, y: 0, z: 0 };
}

function nearestFoe(state: MatchState, a: Athlete): Athlete | null {
  let best: Athlete | null = null;
  for (const o of state.athletes) {
    if (o.team === a.team || o.action === "beaten") continue;
    if (!best || dist(o.pos, a.pos) < dist(best.pos, a.pos)) best = o;
  }
  return best;
}

/**
 * The moment of truth, once per move, against the nearest defender in
 * reach. Close control beats pace; spamming moves, or running one
 * straight into a man or a sliding boot, can give the ball away.
 */
function testDefender(state: MatchState, a: Athlete): void {
  a.skill.tested = true;
  const d = nearestFoe(state, a);
  if (!d || dist(d.pos, a.pos) > SKILL.reach) return;
  const risk = skillRisk(a, d);
  const beat = clamp(0.62 + 1.1 * (a.dribbling - 0.85) - 0.6 * (d.speed - 0.85), 0.3, 0.9);
  const roll = state.rng.next();
  if (roll < risk) return loseBall(state, a, d);
  if (roll > risk + (1 - risk) * beat) return;
  d.action = "beaten";
  d.actionT = 0;
  d.actionLen = SKILL.lag;
  d.noTouch = SKILL.lag;
  sell(a, d);
  state.events.push({ type: "skillResult", athlete: a.id, defender: d.id, result: "beat" });
}

/**
 * Sends a beaten defender lunging the wrong way: away from the side the
 * move goes, or for a move straight at them, off the line it runs. Without
 * it a flick over a man standing square leaves the dribbler stuck on his back.
 */
function sell(a: Athlete, d: Athlete): void {
  const f = fromAngle(d.facing);
  const lat = { x: -f.z, z: f.x };
  const across = dot(a.skill.exit, lat);
  const way = Math.abs(across) > 0.3 ? -Math.sign(across) : dot(sub(a.pos, d.pos), lat) > 0 ? -1 : 1;
  // The renderer reads the side to lunge the matching foot out.
  d.skill.side = way > 0 ? 1 : -1;
  d.vel = { x: lat.x * way * SKILL.lunge, z: lat.z * way * SKILL.lunge };
}

/** The chance a move goes wrong against this defender. */
export function skillRisk(a: Athlete, d: Athlete): number {
  const to = sub(d.pos, a.pos);
  const gap = len(to);
  // Straight into the man: the exit runs right at them from close up. A rainbow goes over, so only very close counts.
  const into = a.skill.kind === "rainbow" ? gap < 0.7 : gap < 1.4 && dot(norm(to), a.skill.exit) > 0.85;
  const spam = Math.max(0, a.skill.heat - 1.5) * 0.16;
  const slide = d.action === "slide" ? 0.35 : 0;
  return clamp(SKILL.risk + spam + (into ? 0.3 : 0) + slide - 0.2 * (a.dribbling - 0.85), 0.02, 0.8);
}

function loseBall(state: MatchState, a: Athlete, d: Athlete): void {
  const ball = state.ball;
  const toward = norm(sub(d.pos, ball.pos));
  ball.owner = null;
  ball.vel = { x: toward.x * 3, y: 0.4, z: toward.z * 3 };
  ball.lastTouch = { team: d.team, id: d.id };
  ball.passTo = null;
  a.noTouch = 0.45;
  state.events.push({ type: "skillResult", athlete: a.id, defender: d.id, result: "lost" });
}

/** A wrong footed defender brakes, then turns to chase. */
export function updateBeaten(a: Athlete, target: Vec2, dt: number): void {
  brake(a, dt, 7);
  if (a.actionT > a.actionLen * 0.4) turnToward(a, angleOf(sub(target, a.pos)), 5 * dt);
}

/** Cools a player's moves off between uses. */
export function coolSkill(a: Athlete, dt: number): void {
  a.skill.wait = Math.max(0, a.skill.wait - dt);
  a.skill.heat = Math.max(0, a.skill.heat - SKILL.heatDecay * dt);
}
