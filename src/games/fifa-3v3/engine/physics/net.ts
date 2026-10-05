import type { Ball } from "../types";
import { BALL_BODY, NET } from "./constants";
import { panelFrame, PANELS, type PanelId } from "./net-panels";

export type { PanelId } from "./net-panels";

const R = BALL_BODY.radius;

/**
 * One sheet of a goal's netting. It is held by the frame and gives where
 * the ball meets it: a dent at (u, v) on the sheet, pushed `depth` out
 * of the goal (negative for in), moving at `speed`. The renderer bends
 * the drawn net by these same numbers.
 */
export interface NetPanel {
  u: number;
  v: number;
  depth: number;
  speed: number;
  /** Which side of the sheet the ball is on: -1 inside the goal, 1 outside. */
  side: -1 | 1;
  touching: boolean;
}

export type GoalNet = Record<PanelId, NetPanel>;
/** The nets of the goal Red defends (left) and the one Blue defends (right). */
export type Nets = [GoalNet, GoalNet];

function panel(): NetPanel {
  return { u: 0, v: 0, depth: 0, speed: 0, side: -1, touching: false };
}

export function newNets(): Nets {
  const goal = (): GoalNet => ({ back: panel(), left: panel(), right: panel(), roof: panel() });
  return [goal(), goal()];
}

/** How slack the sheet is at (u, v), from tauter at the frame to 1 in the middle: the dent stiffens near the frame. */
export function slack(id: PanelId, u: number, v: number): number {
  const f = PANELS[id];
  const middle = Math.max(0, Math.sin((Math.PI * u) / f.w) * Math.sin((Math.PI * v) / f.h));
  return 0.45 + 0.55 * middle;
}

/**
 * One substep of both goals' nets and the ball. Each sheet is a damped
 * spring back to the frame. Where the ball presses into a sheet, the
 * sheet gives: the ball and the netting move on together (a perfectly
 * soft collision), the spring then slows both, and the mesh grabs at a
 * ball sliding along it. A hard shot pushes the back of the net most of
 * a metre out and drops dead; a soft one barely ruffles it. Returns the
 * speed the ball first struck a sheet at, for the sound.
 */
export function stepNets(nets: Nets, ball: Ball | null, h: number): number {
  let struck = 0;
  for (let g = 0; g < 2; g++) {
    const end = g === 0 ? -1 : 1;
    const goal = nets[g]!;
    for (const id of Object.keys(PANELS) as PanelId[]) {
      const p = goal[id];
      const k = NET.stiffness / slack(id, p.u, p.v) ** 2;
      // Stretching out it gives freely; coming back it is damped well past critical, so it gives little back.
      const ratio = p.speed * p.depth > 0 ? NET.dampOut : NET.dampBack;
      const c = 2 * ratio * Math.sqrt(k * (NET.mass + BALL_BODY.mass));
      p.speed += ((-k * p.depth - c * p.speed) / NET.mass) * h;
      p.depth += p.speed * h;
      if (ball) struck = Math.max(struck, press(p, id, end, ball, h));
    }
  }
  return struck;
}

/** How far out a sheet can be pushed at (u, v): a little at the frame it is tied to, all the way in the middle. */
export function reachOut(id: PanelId, u: number, v: number): number {
  const f = PANELS[id];
  const fromFrame = Math.max(0, Math.min(u, f.w - u, v, f.h - v));
  return NET.maxDepth * (NET.edge + (1 - NET.edge) * Math.min(1, fromFrame / NET.give));
}

/** Past the back of the goal the sheets meet: a side or the roof still holds a ball that pushed the back out, and the back one that pushed a side out. */
const CORNER = R + NET.maxDepth * NET.edge;

function press(p: NetPanel, id: PanelId, end: -1 | 1, ball: Ball, h: number): number {
  const f = panelFrame(id, end, ball.pos);
  const w = PANELS[id].w;
  const across = id === "back" ? f.u > -CORNER && f.u < w + CORNER : f.u > -R && f.u < w + CORNER;
  const near = across && f.v > -R && f.v < PANELS[id].h + R && Math.abs(f.s) < 3;
  const rel = f.s - p.depth;
  const was = p.touching;
  p.touching = near && (p.side < 0 ? rel > -R : rel < R);
  if (!p.touching) {
    p.side = rel < 0 ? -1 : 1;
    return 0;
  }
  p.u = Math.max(0, Math.min(PANELS[id].w, f.u));
  p.v = Math.max(0, Math.min(PANELS[id].h, f.v));
  // The ball's speed out through the sheet, and the sheet's.
  const n = f.normal;
  const outOf = () => ball.vel.x * n.x + ball.vel.y * n.y + ball.vel.z * n.z;
  const nudge = (dv: number) => {
    ball.vel.x += dv * n.x;
    ball.vel.y += dv * n.y;
    ball.vel.z += dv * n.z;
  };
  const vn = outOf();
  const pushing = p.side < 0 ? vn > p.speed : vn < p.speed;
  const hit = pushing && !was ? Math.abs(vn - p.speed) : 0;
  if (pushing) {
    const together = (BALL_BODY.mass * vn + NET.mass * p.speed) / (BALL_BODY.mass + NET.mass);
    nudge(together - vn);
    p.speed = together;
  }
  // The sheet sits against the ball's surface, as far as it can stretch.
  const wanted = f.s - p.side * R;
  const most = reachOut(id, p.u, p.v);
  p.depth = Math.max(-most, Math.min(most, wanted));
  if (p.depth !== wanted) {
    // Fully stretched, the sheet holds the ball back: no further out, and none of its pace that way.
    const over = wanted - p.depth;
    ball.pos.x -= over * n.x;
    ball.pos.y -= over * n.y;
    ball.pos.z -= over * n.z;
    p.speed = 0;
    const left = outOf();
    if (left * -p.side > 0) nudge(-left);
  }
  // The mesh grabs at the ball as it slides across.
  const grab = 1 - Math.exp(-NET.grab * h);
  const along = outOf();
  ball.vel.x -= (ball.vel.x - along * n.x) * grab;
  ball.vel.y -= (ball.vel.y - along * n.y) * grab * 0.5;
  ball.vel.z -= (ball.vel.z - along * n.z) * grab;
  return hit;
}
