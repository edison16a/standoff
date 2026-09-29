import { angleDiff, lerp, norm3 } from "./vec";
import type { MatchView } from "./view";

const mixAngle = (a: number, b: number, t: number) => a + angleDiff(a, b) * t;

/**
 * A still part way between two, for smooth slow motion replays.
 * Positions, facing, the ball and its spin blend; states like the action
 * switch at the halfway mark.
 */
export function blendViews(a: MatchView, b: MatchView, t: number): MatchView {
  const pick = t < 0.5 ? a : b;
  const ba = a.ball;
  const bb = b.ball;
  return {
    ...pick,
    time: lerp(a.time, b.time, t),
    clock: lerp(a.clock, b.clock, t),
    ball: {
      ...pick.ball,
      x: lerp(ba.x, bb.x, t), y: lerp(ba.y, bb.y, t), z: lerp(ba.z, bb.z, t),
      vx: lerp(ba.vx, bb.vx, t), vy: lerp(ba.vy, bb.vy, t), vz: lerp(ba.vz, bb.vz, t),
      axis: norm3({ x: lerp(ba.axis.x, bb.axis.x, t), y: lerp(ba.axis.y, bb.axis.y, t), z: lerp(ba.axis.z, bb.axis.z, t) }),
      roll: lerp(ba.roll, bb.roll, t),
    },
    athletes: pick.athletes.map((p, i) => {
      const from = a.athletes[i] ?? p;
      const to = b.athletes[i] ?? p;
      const same = from.action === to.action;
      return {
        ...p,
        x: lerp(from.x, to.x, t),
        z: lerp(from.z, to.z, t),
        yaw: mixAngle(from.yaw, to.yaw, t),
        speed: lerp(from.speed, to.speed, t),
        actionT: same ? lerp(from.actionT, to.actionT, t) : p.actionT,
      };
    }),
  };
}
