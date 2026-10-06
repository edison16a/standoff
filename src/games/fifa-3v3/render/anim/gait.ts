import { cycleLength, TOUCH_AT } from "../../engine/stride";
import { BALL } from "../../engine/tuning";
import { bump, clamp01, smooth, steer, type Context, type FootPlan, type Frame } from "./frame";
import { styleOf, type GaitStyle } from "./gait-style";
import { upperBody } from "./gait-upper";
import { LEFT, RIGHT, type Foot, type Side } from "./leg-ik";
import { neutral } from "./pose";

/**
 * Walking, running and standing. Each foot spends part of every stride
 * cycle planted and the rest swinging through. While planted it slides
 * back under the body at exactly the body's speed, so on the turf it
 * stays put; the swing then carries it forward to land a stance ahead.
 * How the body carries itself comes from the speed (gait-style.ts), and
 * the trunk, arms and head ride on the same cycle (gait-upper.ts). The
 * lead boot's swing ends on the ball when dribbling, on the touch the
 * simulation pushes the ball with.
 */

const TAU = Math.PI * 2;

/** The share of a cycle each foot is down: most of it walking, under a third at a sprint. */
function duty(speed: number, cycle: number): number {
  // Capped so a stance never asks the leg to reach further than it can.
  return Math.min(Math.max(0.3, 0.62 - 0.045 * speed), 0.6 / cycle);
}

/** Where the cycle puts each foot, the lead first, and the pelvis's rise and fall. */
function stepFeet(stride: number, speed: number, ctx: Context, hz: number, style: GaitStyle): { feet: [FootPlan, FootPlan]; bob: number; qRight: number; duty: number } {
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
      // A walker lands on the heel and rolls through; everyone peels the heel late and pushes off the toes.
      const peel = smooth((t - 0.62) / 0.38);
      y += 0.035 * b.s * peel * (0.4 + 0.6 * a);
      toe = style.pushOff * peel - 0.22 * (1 - style.run) * (1 - smooth(t / 0.2));
    } else {
      const w = (q - d) / (1 - d);
      along = -half + (2 * half * (1 - Math.cos(Math.PI * w))) / 2;
      // Early in the swing the heel kicks up behind; at speed the knee then drives through high; it reaches forward low to land.
      const kick = bump(w / 0.55);
      along -= 0.16 * b.s * kick * style.kickUp;
      y += (0.05 + 0.08 * a) * b.s * bump(w) + 0.3 * b.s * kick * style.kickUp + style.kneeDrive * b.s * bump((w - 0.3) / 0.6);
      toe = 0.55 * a * (1 - smooth(w / 0.4)) - (0.2 + 0.15 * (1 - style.run)) * smooth((w - 0.6) / 0.4);
    }
    // A foot in its stance is pinned where it landed, which also holds it still while the body turns.
    feet.push({ x: x + move.x * along, y, z: hz + move.z * along, toe, plant: q < d });
  }
  // Running, the body is lowest as each foot takes the weight; walking, it vaults highest over it.
  const run = -Math.cos(2 * TAU * (qLead - d / 2));
  const bob = run * style.run - run * (1 - style.run);
  const qRight = ctx.lead === RIGHT ? qLead : frac(qLead + 0.5);
  return { feet: feet as [FootPlan, FootPlan], bob, qRight, duty: d };
}

/** Standing: feet a little apart under the hips, one a touch ahead. */
function standFeet(ctx: Context, hz: number): [Foot, Foot] {
  const b = ctx.build;
  const lead: Foot = { x: ctx.lead * b.hipW * 1.25, y: b.ground, z: hz + 0.06 * b.s, toe: 0 };
  const back: Foot = { x: -ctx.lead * b.hipW * 1.25, y: b.ground, z: hz - 0.05 * b.s, toe: 0 };
  return [lead, back];
}

/** The run, blended into standing as the body slows. A dribbler keeps the arms in, the heels low and the eyes on the ball. */
export function gait(stride: number, speed: number, dribbling: boolean, ctx: Context, time: number, phase: number): Frame {
  const p = neutral();
  const style = styleOf(speed, dribbling);
  const go = smooth((speed - 0.12) / 0.9);
  p.pitch = style.lean * go + 0.02 * (1 - go);
  const hz = p.fwd + ctx.build.hipY * Math.sin(p.pitch);
  const step = stepFeet(stride, speed, ctx, hz, style);
  const stand = standFeet(ctx, hz);
  p.lift = (-0.008 - 0.02 * style.run + style.bob * ctx.build.s * -step.bob) * go - 0.012 * (1 - go);
  upperBody(p, { qRight: step.qRight, duty: step.duty, go }, style, ctx, time, phase, dribbling);
  // Coming to a stop the feet stay where they landed; between standing and running a foot that has ground to cover steps there, lifted.
  const mix = (g: NonNullable<FootPlan>, s: Foot): FootPlan => {
    const lift = Math.min(0.1, Math.hypot(g.x - s.x, g.z - s.z) * 0.5) * 4 * go * (1 - go);
    const plant = go < 0.35 || g.plant;
    return { x: s.x + (g.x - s.x) * go, y: s.y + (g.y - s.y) * go + lift, z: s.z + (g.z - s.z) * go, toe: s.toe + (g.toe - s.toe) * go, plant };
  };
  const lead = mix(step.feet[0]!, stand[0]);
  const back = mix(step.feet[1]!, stand[1]);
  const frame: Frame = ctx.lead === LEFT ? { pose: p, left: lead, right: back } : { pose: p, left: back, right: lead };
  if (dribbling && speed > 0.8) touchBall(frame, stride, ctx);
  return frame;
}

/**
 * The dribble touch: the lead boot's swing finishes on the back of the
 * ball, just as the simulation pushes it on (stride.ts's TOUCH_AT). At
 * pace the ball runs a few strides ahead between touches, so the boot
 * only goes to it on a stride where it is there to be touched.
 */
function touchBall(f: Frame, stride: number, ctx: Context): void {
  const q = frac(stride);
  const { ball, build: b, lead } = ctx;
  const there = 1 - smooth((Math.hypot(ball.x, ball.z) - 0.6 * b.s) / (0.25 * b.s));
  // Rises over the late swing, holds through the touch, and lets go before the foot lands.
  const w = there * smooth((q - 0.8) / 0.1) * (1 - smooth((q - TOUCH_AT - 0.02) / 0.04));
  if (w <= 0) return;
  // The instep meets the ball from behind and a touch inside.
  const at: Foot = { x: ball.x + lead * 0.05 * b.s, y: b.ground + 0.03 * b.s, z: ball.z - BALL.radius - 0.09 * b.s, toe: 0.25 };
  steer(f, lead, at, w);
}

export const frac = (v: number) => v - Math.floor(v);
