import { ROSTER, unit, type CharacterId } from "../roster";
import type { TeamId } from "../teams";
import { MOVE, PITCH, TOUCH, BALL } from "./tuning";
import type { Athlete, Ball } from "./types";
import { angleDiff, clamp, clampLen, fromAngle, len, v2, type Vec2 } from "./vec";

export function makeAthlete(id: number, team: TeamId, slot: number, character: CharacterId, seat: number | null): Athlete {
  const stats = ROSTER[character].stats;
  return {
    id,
    team,
    slot,
    character,
    seat,
    online: seat !== null,
    pos: v2(),
    vel: v2(),
    facing: team === 0 ? 0 : Math.PI,
    action: "free",
    actionT: 0,
    actionLen: 0,
    actionDir: v2(),
    stride: 0,
    noTouch: 0,
    charge: 0,
    charging: false,
    buffered: 0,
    passTo: null,
    lofted: false,
    aimZ: null,
    bufferAim: null,
    power: 0,
    slideDone: false,
    speed: unit(stats.speed),
    shooting: unit(stats.shooting),
    strength: unit(stats.strength),
    dribbling: unit(stats.dribbling),
    brain: { thinkIn: 0, target: v2(), slideWait: 0, passWait: 0, carried: 0, caller: null, callFor: 0 },
    stats: { goals: 0, shots: 0, tackles: 0, passes: 0 },
  };
}

/** Whether a phone is steering this player right now. Otherwise a computer is. */
export function isHuman(a: Athlete): boolean {
  return a.seat !== null && a.online;
}

/** Top running speed in metres per second, from the pace stat. */
export function topSpeed(a: Athlete): number {
  // Stats run from about 60 to 99, so that range spans slowest to fastest.
  const pace = clamp((a.speed - 0.6) / 0.4, 0, 1);
  return MOVE.slowest + (MOVE.fastest - MOVE.slowest) * pace;
}

/** Players stay on the pitch and out of the goals. */
function keepOnPitch(p: Vec2): void {
  p.x = clamp(p.x, -PITCH.halfLength + 0.3, PITCH.halfLength - 0.3);
  p.z = clamp(p.z, -PITCH.halfWidth + 0.35, PITCH.halfWidth - 0.35);
}

/**
 * Runs toward the wanted direction. Players speed up and turn quickly
 * but not instantly, a little slower with the ball, and the stride cycle
 * follows the distance covered so feet never skate.
 */
export function moveAthlete(a: Athlete, want: Vec2, dt: number, carrying: boolean): void {
  let top = topSpeed(a);
  if (carrying) top *= MOVE.withBall + 0.1 * a.dribbling;
  if (a.charging) top *= MOVE.charging;
  const desired = clampLen(want, 1);
  const dvx = desired.x * top - a.vel.x;
  const dvz = desired.z * top - a.vel.z;
  const dv = Math.hypot(dvx, dvz);
  const max = MOVE.accel * dt;
  const k = dv > max ? max / dv : 1;
  a.vel.x += dvx * k;
  a.vel.z += dvz * k;
  integrate(a, dt);
  const speed = len(a.vel);
  if (speed > 0.35) {
    const rate = carrying ? MOVE.turnWithBall + 6 * a.dribbling : MOVE.turnRate;
    turnToward(a, Math.atan2(a.vel.z, a.vel.x), rate * dt);
  }
}

/** Moves by the current velocity, advancing the stride. */
export function integrate(a: Athlete, dt: number): void {
  a.pos.x += a.vel.x * dt;
  a.pos.z += a.vel.z * dt;
  keepOnPitch(a.pos);
  // About two strides a cycle, each roughly the player's height.
  a.stride += (len(a.vel) * dt) / 2.4;
}

export function turnToward(a: Athlete, angle: number, maxTurn: number): void {
  const d = angleDiff(a.facing, angle);
  a.facing += clamp(d, -maxTurn, maxTurn);
}

/** Slows a player to a stop, for stumbles and getting up. */
export function brake(a: Athlete, dt: number, rate = 14): void {
  const k = Math.exp(-rate * dt);
  a.vel.x *= k;
  a.vel.z *= k;
  integrate(a, dt);
}

/**
 * The dribble. The ball rolls just ahead of the boots, pushed out a
 * little on every stride and caught up with again, and it swings round
 * the feet on a turn. Better dribblers keep it tighter.
 */
export function carryBall(a: Athlete, ball: Ball, dt: number): void {
  const face = fromAngle(a.facing);
  const speed = len(a.vel);
  const push = speed > 0.8 ? 0.2 * (0.5 + 0.5 * Math.sin(a.stride * Math.PI * 2)) * Math.min(1, speed / 6) * (1.3 - 0.6 * a.dribbling) : 0;
  const reach = TOUCH.carry * (speed > 0.5 ? 1 : 0.8) + push;
  const tx = a.pos.x + face.x * reach;
  const tz = a.pos.z + face.z * reach;
  const k = 1 - Math.exp(-dt * 20);
  const nx = ball.pos.x + (tx - ball.pos.x) * k;
  const nz = ball.pos.z + (tz - ball.pos.z) * k;
  // The ball stops on the goal line: a goal has to be shot, never walked in.
  const cx = clamp(nx, -PITCH.halfLength + BALL.radius + 0.05, PITCH.halfLength - BALL.radius - 0.05);
  // Along the side boards the ball rolls against them rather than through.
  const cz = clamp(nz, -PITCH.halfWidth + BALL.radius, PITCH.halfWidth - BALL.radius);
  ball.vel.x = (cx - ball.pos.x) / dt;
  ball.vel.y = 0;
  ball.vel.z = (cz - ball.pos.z) / dt;
  ball.pos.x = cx;
  ball.pos.y = BALL.radius;
  ball.pos.z = cz;
  ball.spin.x = ball.spin.y = ball.spin.z = 0;
}

/** Where the boots meet the ball: a little in front of the body. */
export function footPoint(a: Athlete): Vec2 {
  const face = fromAngle(a.facing);
  return { x: a.pos.x + face.x * 0.3, z: a.pos.z + face.z * 0.3 };
}

/** Whether a player is on their feet and able to play the ball. */
export function canPlay(a: Athlete): boolean {
  return a.action === "free" || a.action === "shoot" || a.action === "pass" || a.action === "hurdle";
}

/**
 * Pushes players apart who got too close, so bodies bump rather than
 * pass through each other. Stronger players give less ground.
 */
export function separate(athletes: readonly Athlete[]): void {
  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a = athletes[i]!;
      const b = athletes[j]!;
      if (a.action === "slide" || b.action === "slide") continue;
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= MOVE.personalSpace || d < 1e-6) continue;
      const overlap = MOVE.personalSpace - d;
      const share = 0.5 + 0.35 * (a.strength - b.strength);
      a.pos.x -= (dx / d) * overlap * (1 - share);
      a.pos.z -= (dz / d) * overlap * (1 - share);
      b.pos.x += (dx / d) * overlap * share;
      b.pos.z += (dz / d) * overlap * share;
    }
  }
}
