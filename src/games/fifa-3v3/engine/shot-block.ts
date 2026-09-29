import { blockLane, blockSharpness } from "./build-effects";
import { JUMP } from "./defend";
import type { Athlete, MatchState } from "./types";
import { clamp, clamp01, type Vec3 } from "./vec";

/** How far to the side of the ball's line an ordinary defender can still throw a leg or the body in. Reach stretches it. */
const REACH = 0.95;
/** The nearest and furthest along the line a block can happen, in metres from the ball. */
const NEAR = 1.1;
const FAR = 11;

export interface BlockPlan {
  id: number;
  /** How long the blocker's leap lasts. */
  leap: number;
  /** Where the ball meets the body. The kick is solved to fly through it. */
  at: Vec3;
}

/**
 * Whether a defender standing in the shot's path gets a body on it.
 * Every opponent near the line from the ball to the target gets a roll:
 * the more central in the lane, the closer to the shooter and the harder
 * the chance (a low quality shot through a crowd), the likelier the
 * block. Long reach widens the lane a body covers, and quick reflexes
 * get it there more often. The ball is then struck at the body, and blockers.ts bounces it
 * off with real physics.
 */
export function planBlock(state: MatchState, shooter: Athlete, from: Vec3, target: Vec3, quality: number, speed: number): BlockPlan | null {
  const dx = target.x - from.x;
  const dz = target.z - from.z;
  const length = Math.hypot(dx, dz);
  if (length < NEAR + 1) return null;
  const ux = dx / length;
  const uz = dz / length;
  let best: { a: Athlete; along: number; across: number } | null = null;
  for (const o of state.athletes) {
    if (o.team === shooter.team || !canBlock(o)) continue;
    const rx = o.pos.x - from.x;
    const rz = o.pos.z - from.z;
    const along = rx * ux + rz * uz;
    if (along < NEAR || along > Math.min(FAR, length - 0.8)) continue;
    // Solving the kick needs the body to be ahead along the pitch, not level with the ball.
    if (Math.abs(o.pos.x - from.x) < 0.9) continue;
    const across = rx * uz - rz * ux;
    const reach = REACH * blockLane(o);
    if (Math.abs(across) > reach) continue;
    // Central in the lane and close to the boot gives the defender the most time and the biggest target.
    const lane = 1 - Math.abs(across) / reach;
    const close = 1 - (along - NEAR) / (FAR - NEAR);
    const chance = clamp01(lane * (0.25 + 0.55 * (1 - quality)) * (0.55 + 0.45 * close) * blockSharpness(o) + (o.action === "jump" ? 0.15 : 0));
    if (!state.rng.chance(chance)) continue;
    if (!best || along < best.along) best = { a: o, along, across };
  }
  if (!best) return null;
  const o = best.a;
  const arrive = best.along / Math.max(8, speed);
  // The leap lasts until just after the ball gets there, so a far block is still in the air for it.
  const leap = Math.max(JUMP.length, arrive + 0.25);
  // Slightly off the middle of the body, so it glances off rather than bouncing straight back.
  const side = clamp(best.across, -0.12, 0.12);
  const y = liftAt(arrive, leap) + state.rng.range(0.3, 1.35);
  return { id: o.id, leap, at: { x: o.pos.x - side * uz, y, z: o.pos.z + side * ux } };
}

/** Standing, running or already up for a jump: not on the floor or mid slide. */
function canBlock(a: Athlete): boolean {
  return a.action === "free" || a.action === "jump" || a.action === "beaten";
}

/** The block itself is a leap into the path: how high the boots are `t` seconds in, as jumpHeight has it. */
function liftAt(t: number, leap: number): number {
  const u = clamp(t / leap, 0, 1);
  return 4 * JUMP.height * u * (1 - u);
}

/** Puts the blocker into the leap, square on and planted, so the body is where the kick was aimed. */
export function throwBodyIn(state: MatchState, plan: BlockPlan): void {
  const o = state.athletes[plan.id];
  if (!o) return;
  o.action = "jump";
  o.actionT = 0;
  o.actionLen = plan.leap;
  o.vel = { x: 0, z: 0 };
  o.noTouch = 0;
  o.charging = false;
  o.guard.on = false;
  state.events.push({ type: "jump", athlete: o.id });
}
