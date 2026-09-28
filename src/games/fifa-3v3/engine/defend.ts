import { brake, footPoint } from "./athlete";
import { commitFoul } from "./foul";
import type { Athlete, MatchState } from "./types";
import { clamp, dist, dot, fromAngle, len, norm, sub, type Vec2 } from "./vec";

/**
 * The two standing defensive moves beside the slide: a steal, a quick
 * poke at the dribbler's ball, and a jump to block a shot or a pass.
 * Both can give away a foul: a steal through the back of the man, or a
 * jump into him.
 */
export const STEAL = {
  length: 0.42,
  /** When the poking boot is at full stretch. */
  strikeAt: 0.15,
  /** How far from the body the poke reaches the ball. */
  reach: 1.05,
  lunge: 3.2,
  /** Seconds before the next steal or jump. */
  wait: 0.75,
  /** A missed poke leaves the defender off balance this much longer. */
  missPenalty: 0.25,
} as const;

export const JUMP = {
  length: 0.62,
  /** Peak height of the boots over the turf. */
  height: 0.5,
  wait: 0.7,
  /** Jumping into a dribbler closer than this can be a foul. */
  crowd: 0.75,
} as const;

/** Height of a jumping player's boots, 0 before and after. */
export function jumpHeight(a: Pick<Athlete, "action" | "actionT" | "actionLen">): number {
  if (a.action !== "jump" || a.actionT <= 0) return 0;
  const u = clamp(a.actionT / a.actionLen, 0, 1);
  return 4 * JUMP.height * u * (1 - u);
}

export function startSteal(state: MatchState, a: Athlete): void {
  if (a.defendWait > 0 || a.action !== "free") return;
  const ball = state.ball.pos;
  const toBall = sub(ball, a.pos);
  // Toward the ball when it is close enough to go for, else straight ahead.
  const dir: Vec2 = len(toBall) < 2.6 && len(toBall) > 0.05 ? norm(toBall) : fromAngle(a.facing);
  a.action = "steal";
  a.actionT = 0;
  a.actionLen = STEAL.length;
  a.actionDir = dir;
  a.facing = Math.atan2(dir.z, dir.x);
  a.vel = { x: dir.x * STEAL.lunge, z: dir.z * STEAL.lunge };
  a.defendWait = STEAL.wait;
  a.slideDone = false;
}

export function updateSteal(state: MatchState, a: Athlete, before: number, dt: number): void {
  brake(a, dt, 7);
  if (before >= STEAL.strikeAt || a.actionT < STEAL.strikeAt || a.slideDone) return;
  a.slideDone = true;
  const owner = state.ball.owner;
  const victim = owner?.kind === "athlete" ? state.athletes[owner.id] : undefined;
  const boot = { x: a.pos.x + a.actionDir.x * 0.7, z: a.pos.z + a.actionDir.z * 0.7 };
  if (!victim || victim.team === a.team || victim.action === "hurdle" || dist(boot, state.ball.pos) > STEAL.reach) {
    a.actionLen += STEAL.missPenalty;
    return;
  }
  const behind = Math.max(0, dot(a.actionDir, fromAngle(victim.facing)));
  const chance = clamp(
    0.44 + 0.45 * (a.strength - victim.strength) - 0.4 * (victim.dribbling - 0.75) - 0.3 * behind + (a.guard.on ? 0.12 : 0) - (victim.action === "skill" ? 0.25 : 0),
    0.08,
    0.82,
  );
  if (state.rng.chance(chance)) {
    // Nicked cleanly: the ball is the defender's.
    const ball = state.ball;
    ball.owner = { kind: "athlete", id: a.id };
    ball.lastTouch = { team: a.team, id: a.id };
    ball.passTo = null;
    ball.heldFor = 0;
    victim.noTouch = 0.45;
    victim.charging = false;
    a.stats.tackles++;
    state.events.push({ type: "steal", athlete: a.id, victim: victim.id, won: true });
    return;
  }
  // Through the back of him, or clumsy and late: the referee may see it.
  const foul = 0.1 + 0.4 * behind + 0.08 * Math.max(0, victim.strength - a.strength);
  if (state.rng.chance(foul)) return commitFoul(state, a, victim, "steal");
  a.actionLen += STEAL.missPenalty;
  state.events.push({ type: "steal", athlete: a.id, victim: victim.id, won: false });
}

export function startJump(state: MatchState, a: Athlete): void {
  if (a.defendWait > 0 || a.action !== "free") return;
  a.action = "jump";
  a.actionT = 0;
  a.actionLen = JUMP.length;
  a.defendWait = JUMP.wait;
  a.charging = false;
  state.events.push({ type: "jump", athlete: a.id });
  // Leaping into a dribbler at close range is a foul now and then.
  const owner = state.ball.owner;
  const carrier = owner?.kind === "athlete" ? state.athletes[owner.id] : undefined;
  if (!carrier || carrier.team === a.team || dist(footPoint(a), carrier.pos) > JUMP.crowd) return;
  const into = clamp(len(a.vel) / 6, 0, 1);
  if (state.rng.chance(0.12 + 0.35 * into)) commitFoul(state, a, carrier, "jump");
}

/** In the air the run carries on a little, then the landing soaks it up. */
export function updateJump(a: Athlete, dt: number): void {
  brake(a, dt, a.actionT < a.actionLen * 0.8 ? 1.5 : 10);
}

export function coolDefend(a: Athlete, dt: number): void {
  a.defendWait = Math.max(0, a.defendWait - dt);
}
