import { units } from "../attributes";
import { BUILDS, type BuildId } from "../builds";
import type { TeamId } from "../teams";
import { touchPush } from "./stride";
import { MOVE, PITCH, TOUCH, BALL } from "./tuning";
import type { Athlete, Ball } from "./types";
import { clamp, fromAngle, len, v2, type Vec2 } from "./vec";

export { brake, integrate, moveAthlete, topSpeed, turnToward } from "./locomotion";

export function makeAthlete(id: number, team: TeamId, slot: number, build: BuildId, seat: number | null): Athlete {
  return {
    id,
    team,
    slot,
    build,
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
    release: null,
    buffered: 0,
    passTo: null,
    lofted: false,
    aimZ: null,
    bufferAim: null,
    bufferHeld: 0,
    power: 0,
    firstTime: false,
    slideDone: false,
    skill: { kind: null, side: 1, from: v2(1, 0), exit: v2(1, 0), pace: 0, wait: 0, heat: 0, tested: false },
    attrs: units(BUILDS[build].ratings),
    brain: { thinkIn: 0, target: v2(), slideWait: 0, passWait: 0, skillWait: 0, carried: 0, caller: null, callFor: 0 },
    stats: { goals: 0, shots: 0, tackles: 0, passes: 0, fouls: 0, blocks: 0 },
    guard: { held: false, on: false, lag: v2() },
    defendWait: 0,
  };
}

/** Whether a phone is steering this player right now. Otherwise a computer is. */
export function isHuman(a: Athlete): boolean {
  return a.seat !== null && a.online;
}

/**
 * The dribble. The ball rolls just ahead of the boots, pushed out a
 * little on every stride and caught up with again, and it swings round
 * the feet on a turn. Better dribblers keep it tighter.
 */
export function carryBall(a: Athlete, ball: Ball, dt: number): void {
  const face = fromAngle(a.facing);
  const speed = len(a.vel);
  // Pushed on the lead boot's touch (see stride.ts), further at pace, less by a close dribbler.
  const push = speed > 0.8 ? 0.22 * touchPush(a.stride) * Math.min(1, speed / 6) * (1.3 - 0.6 * a.attrs.dribbling) : 0;
  const reach = TOUCH.carry * (speed > 0.5 ? 1 : 0.8) + push;
  const tx = a.pos.x + face.x * reach;
  const tz = a.pos.z + face.z * reach;
  // Carried along with the body first and then eased to its spot, so it never trails behind at pace.
  const k = 1 - Math.exp(-dt * 20);
  const nx = ball.pos.x + a.vel.x * dt + (tx - ball.pos.x - a.vel.x * dt) * k;
  const nz = ball.pos.z + a.vel.z * dt + (tz - ball.pos.z - a.vel.z * dt) * k;
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
      const share = 0.5 + 0.35 * (a.attrs.strength - b.attrs.strength);
      a.pos.x -= (dx / d) * overlap * (1 - share);
      a.pos.z -= (dz / d) * overlap * (1 - share);
      b.pos.x += (dx / d) * overlap * share;
      b.pos.z += (dz / d) * overlap * share;
    }
  }
}
