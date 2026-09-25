import { charOf } from "./athlete";
import type { Match } from "./match";
import type { Athlete } from "./types";
import { clamp, lerp } from "./vec";

/**
 * The rhythm of the dribble and the ball's path under the hand. The
 * animation reads the same stride numbers, so the ball keeps time with
 * the feet: one bounce for every two steps on the run, a quick hard
 * pound when standing, and the moves speeding it up or holding it.
 */

/** The legs of the model, hip to ankle, as a share of the player's height. */
export const LEG_SHARE = 0.477;

/** How far each hip swings through a stride, in radians, growing with speed. */
export const strideSwing = (speed: number) => 0.12 + Math.min(1, speed / 6.5) * 0.72;

/**
 * The ground covered by one full stride cycle (a step with each foot)
 * for legs of length `leg`. The stride advances by the distance run
 * over this, so a planted foot moves back exactly as fast as the body
 * goes forward and the feet do not skate.
 */
export function strideLength(speed: number, leg: number, guarding: boolean): number {
  // Feet split 2 leg sin(swing) apart at full stride; the bent knee shortens that a little.
  const swing = guarding ? 0.3 : strideSwing(speed);
  return Math.max(0.35, 4 * leg * Math.sin(swing) * 0.88);
}

/** Bounces a second standing still: the low, hard pound dribble. */
const POUND = 2.3;
/** After a catch or a pickup the ball sits in both hands this long before the first push. */
export const POCKET = 0.22;
/** The spin pulls the ball through the turn in one hand until this far into the move. */
const SPIN_CARRY = 0.46;

/** How fast the ball bounces right now, in bounces a second. */
export function dribbleRate(a: Athlete, speed: number): number {
  const leg = LEG_SHARE * charOf(a).build.height;
  const stride = speed / strideLength(speed, leg, false);
  const base = lerp(POUND, Math.max(1.5, stride), clamp(speed / 1.6, 0, 1));
  const act = a.action;
  if (act.kind !== "move") return base;
  switch (act.move) {
    case "crossover":
    case "behindBack":
      // A quick, low push across; a ball still on its way up is met early.
      return Math.max(3, base * 1.5) * (a.crossArmed ? 1 : 1.8);
    case "hesitation":
      return act.t < 0.26 ? 1.4 : 3;
    case "stepback":
      return 2.8;
    case "spin":
      // Quick back up into the hand, to be pulled round.
      return 5;
  }
}

/** True while the ball sits in the hand rather than bouncing: the pocket after a catch, or the pull through a spin. */
export const palmHold = (a: Athlete): boolean => a.pocket > 0;

/** Pulled through a spin in the dribbling hand, rather than held in both at the chest. */
export const spinCarry = (a: Athlete): boolean => a.pocket > 0 && a.action.kind === "move" && a.action.move === "spin";

/** The ball on the dribble, or held a moment in the hand. Called every step while the holder has it low. */
export function dribbleBall(m: Match, a: Athlete, dt: number): void {
  const b = m.ball;
  const h = charOf(a).build.height;
  const fx = Math.sin(a.yaw);
  const fz = Math.cos(a.yaw);
  const rx = -fz;
  const rz = fx;
  const speed = Math.hypot(a.vx, a.vz);
  const act = a.action;
  if (a.pocket > 0) {
    a.pocket = Math.max(0, a.pocket - dt);
    a.dribble = 0;
    const carry = spinCarry(a);
    const fwd = carry ? 0.14 : 0.3;
    const side = carry ? 0.34 * a.dribbleHand : 0;
    b.pos = { x: a.x + fx * fwd + rx * side, y: a.y + h * (carry ? 0.5 : 0.6), z: a.z + fz * fwd + rz * side };
    return;
  }
  const before = a.dribble;
  a.dribble = (a.dribble + dribbleRate(a, speed) * dt) % 1;
  if (before < 0.5 && a.dribble >= 0.5) m.emit({ type: "bounce", id: a.id, x: b.pos.x, z: b.pos.z, power: 0.5 + speed / 12 });
  if (a.dribble < before) {
    // Back in the hand: a cross waiting on this bounce can go now, and a spin takes the ball with it.
    a.crossArmed = true;
    if (act.kind === "move" && act.move === "spin" && act.t < SPIN_CARRY) {
      a.pocket = SPIN_CARRY - act.t;
      a.dribble = 0;
    }
  }
  // Pushed down hard, so the bounce is sharp at the floor and slow at the top, where the hand meets it.
  const still = 1 - clamp(speed / 1.6, 0, 1);
  const tall = act.kind === "move" && act.move === "hesitation" && act.t < 0.26;
  const hand = h * (tall ? 0.5 : lerp(0.46, 0.4, still));
  const drop = 1 - Math.abs(1 - 2 * a.dribble);
  const y = 0.12 + (hand - 0.12) * (1 - drop * drop);
  let fwd = 0.26;
  // Behind the back the ball goes round behind the hips on its way across.
  if (act.kind === "move" && act.move === "behindBack" && a.crossArmed) {
    const across = 1 - Math.abs(a.dribbleSide - a.dribbleHand) / 2;
    fwd = lerp(fwd, -0.24, Math.sin(Math.PI * clamp(across, 0, 1)));
  }
  // Out to the side of the dribbling hand, through the middle in front during a crossover,
  // and pushed out ahead of the run so the player runs onto it.
  const side = 0.3 * a.dribbleSide;
  const lead = 0.06;
  b.pos = { x: a.x + fx * fwd + rx * side + a.vx * lead, y, z: a.z + fz * fwd + rz * side + a.vz * lead };
}
