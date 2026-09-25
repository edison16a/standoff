import { cycleLength, TOUCH_AT } from "../../engine/stride";
import { BALL } from "../../engine/tuning";
import { bump, clamp01, smooth, steer, type Context, type FootPlan, type Frame } from "./frame";
import { LEFT, RIGHT, type Foot, type Side } from "./leg-ik";
import { neutral } from "./pose";

/**
 * Running and standing. Each foot spends part of every stride cycle
 * planted and the rest swinging through. While planted it slides back
 * under the body at exactly the body's speed, so on the turf it stays
 * put; the swing then carries it forward to land a stance ahead. The
 * lead boot's swing ends on the ball when dribbling, on the touch the
 * simulation pushes the ball with.
 */

const TAU = Math.PI * 2;

/** The share of a cycle each foot is down: most of it when jogging, under a third at a sprint. */
function duty(speed: number, cycle: number): number {
  // Capped so a stance never asks the leg to reach further than it can.
  return Math.min(Math.max(0.3, 0.62 - 0.045 * speed), 0.6 / cycle);
}

/** Where the cycle puts each foot, the lead first, and the pelvis bob. */
function stepFeet(stride: number, speed: number, ctx: Context, hz: number, kickUp: number): { feet: [FootPlan, FootPlan]; bob: number; qRight: number } {
  const { build: b, move } = ctx;
  const a = clamp01(speed / 7.5);
  const cycle = cycleLength(speed);
  const d = duty(speed, cycle);
  const half = (d * cycle) / 2;
  const feet: NonNullable<FootPlan>[] = [];
  let qLead = 0;
  for (const side of [ctx.lead, -ctx.lead as Side]) {
    const q = frac(stride + (side === ctx.lead ? 0 : 0.5));
    if (side === ctx.lead) qLead = q;
    // Feet land nearer the midline at pace, as runners do.
    const x = side * b.hipW * (1.05 - 0.5 * a);
    let along: number;
    let y = b.ground;
    let toe: number;
    if (q < d) {
      const t = q / d;
      along = half - 2 * half * t;
      // The heel peels off late in the stance, rolling onto the toes.
      const peel = smooth((t - 0.65) / 0.35);
      y += 0.035 * b.s * peel * a;
      toe = 0.55 * peel * a;
    } else {
      const w = (q - d) / (1 - d);
      along = -half + 2 * half * (1 - Math.cos(Math.PI * w)) / 2;
      // Early in the swing the heel kicks up behind; it reaches forward low to land.
      const kick = bump(w / 0.55);
      along -= 0.16 * a * b.s * kick * kickUp;
      y += (0.05 + 0.1 * a) * b.s * bump(w) + 0.3 * a * b.s * kick * kickUp;
      toe = 0.55 * a * (1 - smooth(w / 0.4)) - 0.2 * smooth((w - 0.6) / 0.4);
    }
    // A foot in its stance is pinned where it landed, which also holds it still while the body turns.
    feet.push({ x: x + move.x * along, y, z: hz + move.z * along, toe, plant: q < d });
  }
  // Lowest as each foot takes the weight in mid stance, highest in between.
  const bob = -Math.cos(2 * TAU * (qLead - d / 2));
  const qRight = ctx.lead === RIGHT ? qLead : frac(qLead + 0.5);
  return { feet: feet as [FootPlan, FootPlan], bob, qRight };
}

/** Standing: feet a little apart under the hips, one a touch ahead. */
function standFeet(ctx: Context, hz: number): [Foot, Foot] {
  const b = ctx.build;
  const lead: Foot = { x: ctx.lead * b.hipW * 1.25, y: b.ground, z: hz + 0.06 * b.s, toe: 0 };
  const back: Foot = { x: -ctx.lead * b.hipW * 1.25, y: b.ground, z: hz - 0.05 * b.s, toe: 0 };
  return [lead, back];
}

/**
 * The run, blended into standing as the body slows. `dribbling` shortens
 * the arm swing, drops the head to the ball and steers the lead boot
 * onto it at the touch.
 */
export function gait(stride: number, speed: number, dribbling: boolean, ctx: Context, time: number, phase: number): Frame {
  const p = neutral();
  const a = clamp01(speed / 7.5) * (dribbling ? 0.85 : 1);
  const go = smooth((speed - 0.12) / 0.9);
  const breath = Math.sin(time * 2.1 + phase);
  p.pitch = (0.04 + 0.16 * a) * go + 0.02 * (1 - go);
  const hz = p.fwd + ctx.build.hipY * Math.sin(p.pitch);
  // A dribbler keeps the heels low, ready for the next touch.
  const step = stepFeet(stride, speed, ctx, hz, dribbling ? 0.45 : 1);
  const stand = standFeet(ctx, hz);
  const lift = -0.01 - 0.025 * a + 0.02 * a * -step.bob;
  p.lift = lift * go - 0.012 * (1 - go);
  // The arms swing against the legs: the right arm back as the right foot lands.
  const swing = Math.cos(TAU * step.qRight) * go;
  const arm = 0.2 + 0.75 * a;
  p.shRX = swing * arm;
  p.shLX = -swing * arm;
  p.elL = p.elR = -(0.2 + 1.2 * a) * go - 0.15;
  p.shLZ = p.shRZ = (dribbling ? 0.28 : 0.14) * go + (0.16 + breath * 0.02) * (1 - go);
  p.spineY = -swing * 0.14 * a;
  p.neckY = -p.spineY * 0.8;
  p.spineX = 0.04 * (1 - go) + breath * 0.015 * (1 - go);
  p.neckX = dribbling ? 0.3 : -0.05;
  // Between standing and running a foot that has ground to cover steps there, lifted, rather than sliding.
  // Coming to a stop the feet stay where they landed; between standing and running a foot that has ground to cover steps there, lifted.
  const mix = (g: NonNullable<FootPlan>, s: Foot): FootPlan => {
    const step = Math.min(0.1, Math.hypot(g.x - s.x, g.z - s.z) * 0.5) * 4 * go * (1 - go);
    const plant = go < 0.35 || g.plant;
    return { x: s.x + (g.x - s.x) * go, y: s.y + (g.y - s.y) * go + step, z: s.z + (g.z - s.z) * go, toe: s.toe + (g.toe - s.toe) * go, plant };
  };
  const lead = mix(step.feet[0]!, stand[0]);
  const back = mix(step.feet[1]!, stand[1]);
  const frame: Frame = ctx.lead === LEFT ? { pose: p, left: lead, right: back } : { pose: p, left: back, right: lead };
  if (dribbling && speed > 0.8) touchBall(frame, stride, ctx);
  return frame;
}

/**
 * The dribble touch: the lead boot's swing finishes on the back of the
 * ball, just as the simulation pushes it on (stride.ts's TOUCH_AT).
 */
function touchBall(f: Frame, stride: number, ctx: Context): void {
  const q = frac(stride);
  // Rises over the late swing, holds through the touch, and lets go before the foot lands.
  const w = smooth((q - 0.8) / 0.1) * (1 - smooth((q - TOUCH_AT - 0.02) / 0.04));
  if (w <= 0) return;
  const { ball, build: b, lead } = ctx;
  // The instep meets the ball from behind and a touch inside.
  const at: Foot = { x: ball.x + lead * 0.05 * b.s, y: b.ground + 0.03 * b.s, z: ball.z - BALL.radius - 0.09 * b.s, toe: 0.25 };
  steer(f, lead, at, w);
}

export const frac = (v: number) => v - Math.floor(v);
