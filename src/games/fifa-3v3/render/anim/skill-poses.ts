import type { SkillKind } from "../../engine/types";
import { BALL } from "../../engine/tuning";
import { bump, plant, smooth, steer, track, window, type Context, type Frame } from "./frame";
import { gait } from "./gait";
import { LEFT, RIGHT, type Foot, type Side } from "./leg-ik";

/**
 * Skill moves and the wrong footed defender. The body's run, its turn
 * and the ball's path come from the engine's script (skill-moves.ts);
 * here the feet work the ball. Each move keeps running on the stride
 * underneath, and over its contact windows steers one boot onto the
 * ball where it is drawn, so the ball is never off the boot when it
 * should be on it. The other foot plants and takes the weight.
 */

const R = BALL.radius;

/** The sole on top of the ball, rolling it. */
const sole = (c: Context): Foot => ({ x: c.ball.x, y: Math.max(c.build.ground, c.ball.y + R + 0.03 * c.build.s), z: c.ball.z - 0.07 * c.build.s, toe: -0.25 });
/** The inside of `foot` against the ball, from the foot's own side. */
const inside = (c: Context, foot: Side): Foot => ({ x: c.ball.x + foot * (R + 0.05 * c.build.s), y: c.build.ground + 0.02 * c.build.s, z: c.ball.z - 0.05 * c.build.s, toe: 0 });
/** The outside of `foot` against the ball, from the far side. */
const outside = (c: Context, foot: Side): Foot => ({ x: c.ball.x - foot * (R + 0.06 * c.build.s), y: c.build.ground + 0.02 * c.build.s, z: c.ball.z - 0.04 * c.build.s, toe: 0 });

/** `u` is the move's progress, 0 to 1; `side` is the engine's skill side, +1 taking the ball to the body's right. */
export function skillFrame(kind: SkillKind, u: number, side: 1 | -1, stride: number, speed: number, ctx: Context, time: number): Frame {
  const f = gait(stride, Math.min(speed, 5), false, ctx, time, 0);
  const p = f.pose;
  const lead = ctx.lead;
  const other = -lead as Side;
  // The foot on the side the ball ends up works it across with its inside.
  const worker: Side = side === 1 ? LEFT : RIGHT;
  switch (kind) {
    case "rainbow": {
      // Sole rolls it back, the instep scoops it up the other calf, and that heel flicks it over.
      steer(f, lead, sole(ctx), window(u, 0, 0.08, 0.1, 0.15));
      // The instep lifts with the ball only as far as the calf, then lets the heel take it.
      const scoopY = Math.min(Math.max(ctx.build.ground, ctx.ball.y - 0.06), ctx.build.ground + 0.2 * ctx.build.s);
      const scoop: Foot = { x: ctx.ball.x, y: scoopY, z: ctx.ball.z - R - 0.07 * ctx.build.s, toe: 1.0 };
      steer(f, lead, scoop, window(u, 0.1, 0.15, 0.2, 0.27));
      if (u > 0.06 && u < 0.2) plant(f, other);
      // Back down beside the ball's old spot to take the weight while the other heel flicks.
      const down: Foot = { x: lead * ctx.build.hipW, y: ctx.build.ground, z: 0.05 * ctx.build.s, toe: 0 };
      steer(f, lead, down, window(u, 0.2, 0.27, 0.45, 0.55));
      if (u > 0.27 && u < 0.45) plant(f, lead);
      const heel: Foot = { x: other * ctx.build.hipW * 0.6, y: ctx.build.ground + 0.5 * ctx.build.s, z: -0.3 * ctx.build.s, toe: 0.9 };
      steer(f, other, heel, window(u, 0.19, 0.24, 0.3, 0.4));
      const up = window(u, 0.2, 0.3, 0.55, 0.75);
      p.neckX = 0.35 - 0.75 * up;
      p.pitch += 0.12 * window(u, 0, 0.1, 0.18, 0.28) - 0.08 * up;
      spread(f, 0.55 * window(u, 0.05, 0.2, 0.4, 0.6));
      break;
    }
    case "crossover": {
      // The outside foot plants, the inside of the other drags the ball across, and the body leans into the cut.
      steer(f, worker, inside(ctx, worker), window(u, 0, 0.2, 0.62, 0.78));
      if (u > 0.04 && u < 0.5) plant(f, -worker as Side);
      p.roll = side * 0.2 * window(u, 0.1, 0.35, 0.6, 0.95);
      p.lift -= 0.05 * bump(u);
      p.spineY += -side * 0.25 * bump(u / 0.8);
      spread(f, 0.4 * bump(u));
      break;
    }
    case "elastico": {
      // Out with the outside of the boot, over the top, and snapped back with the inside.
      const worked = track(u, [
        [0.02, outside(ctx, worker)],
        [0.3, outside(ctx, worker)],
        [0.36, { ...sole(ctx), y: ctx.build.ground + 0.2 * ctx.build.s }],
        [0.42, inside(ctx, worker)],
        [0.62, inside(ctx, worker)],
      ]);
      steer(f, worker, worked, window(u, 0, 0.14, 0.62, 0.76));
      if (u > 0.03 && u < 0.62) plant(f, -worker as Side);
      p.roll = -side * 0.2 * bump(u / 0.36) + side * 0.22 * window(u, 0.36, 0.5, 0.7, 0.95);
      p.spineY += side * 0.3 * bump(u / 0.36) - side * 0.2 * window(u, 0.36, 0.5, 0.7, 0.95);
      p.lift -= 0.05 * bump(u / 0.7);
      spread(f, 0.45 * bump(u / 0.8));
      break;
    }
    case "dragback": {
      // The sole rolls the ball back under the body, leaning away from the man, then the body turns with it.
      steer(f, lead, sole(ctx), window(u, 0, 0.12, 0.42, 0.52));
      if (u > 0.04 && u < 0.5) plant(f, other);
      const lean = window(u, 0.05, 0.2, 0.4, 0.6);
      p.pitch += -0.16 * lean;
      p.spineX -= 0.1 * lean;
      p.neckX = 0.4;
      spread(f, 0.5 * lean);
      break;
    }
    case "roulette": {
      // Two sole drags: the lead foot turns the ball on the first half turn while the body pivots on the other, then they swap.
      steer(f, lead, sole(ctx), window(u, 0, 0.12, 0.38, 0.46));
      steer(f, other, sole(ctx), window(u, 0.46, 0.54, 0.76, 0.84));
      if (u > 0.04 && u < 0.46) plant(f, other);
      if (u > 0.5 && u < 0.84) plant(f, lead);
      p.lift -= 0.04 * bump(u);
      p.neckX = 0.4;
      spread(f, 0.6 * bump((u - 0.02) / 0.9));
      break;
    }
  }
  return f;
}

/** Arms held out for balance. */
function spread(f: Frame, k: number): void {
  f.pose.shLZ += k;
  f.pose.shRZ += k;
  f.pose.elL -= 0.3 * k;
  f.pose.elR -= 0.3 * k;
}

/**
 * Wrong footed: caught with the weight going the wrong way, the feet
 * stuck, the body tipping back and one arm flung out, then gathering
 * and turning to chase.
 */
export function beatenFrame(t: number, length: number, stride: number, speed: number, ctx: Context, time: number, id: number): Frame {
  const f = gait(stride, speed, false, ctx, time, id);
  const p = f.pose;
  const u = t / length;
  const caught = window(u, 0, 0.12, 0.45, 0.8);
  // Which way they were sold, fixed per player so the same man always falls the same way.
  const way = id % 2 === 0 ? 1 : -1;
  if (u < 0.5) {
    plant(f, LEFT);
    plant(f, RIGHT);
  }
  p.roll += way * 0.2 * caught;
  p.pitch -= 0.2 * caught;
  p.lift -= 0.06 * caught;
  p.spineY += way * 0.35 * caught;
  p.neckY -= way * 0.5 * caught;
  p.neckX = -0.1 * caught;
  if (way === 1) p.shLZ += 1.1 * caught;
  else p.shRZ += 1.1 * caught;
  p.shLX -= 0.4 * caught;
  p.shRX -= 0.4 * caught;
  p.elL = p.elR = -0.3 - 0.6 * smooth(u);
  return f;
}
