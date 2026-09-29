import type { KeeperView, MatchView } from "./view";
import { angleDiff } from "./vec";

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixAngle = (a: number, b: number, t: number) => a + angleDiff(a, b) * t;

/**
 * A still part way between two, for smooth slow motion replays.
 * Positions blend; states like the action switch at the halfway mark.
 */
export function blendViews(a: MatchView, b: MatchView, t: number): MatchView {
  const pick = t < 0.5 ? a : b;
  return {
    ...pick,
    time: mix(a.time, b.time, t),
    ball: { ...pick.ball, x: mix(a.ball.x, b.ball.x, t), y: mix(a.ball.y, b.ball.y, t), z: mix(a.ball.z, b.ball.z, t) },
    athletes: pick.athletes.map((p, i) => {
      const from = a.athletes[i] ?? p;
      const to = b.athletes[i] ?? p;
      const sameAction = from.action === to.action;
      return {
        ...p,
        x: mix(from.x, to.x, t),
        z: mix(from.z, to.z, t),
        facing: mixAngle(from.facing, to.facing, t),
        speed: mix(from.speed, to.speed, t),
        stride: mix(from.stride, to.stride, t),
        actionT: sameAction ? mix(from.actionT, to.actionT, t) : p.actionT,
        lift: mix(from.lift, to.lift, t),
      };
    }),
    referee: { ...pick.referee, x: mix(a.referee.x, b.referee.x, t), z: mix(a.referee.z, b.referee.z, t), facing: mixAngle(a.referee.facing, b.referee.facing, t), stride: mix(a.referee.stride, b.referee.stride, t) },
    keepers: pick.keepers.map((p, i) => {
      const from = a.keepers[i] ?? p;
      const to = b.keepers[i] ?? p;
      return { ...p, x: mix(from.x, to.x, t), z: mix(from.z, to.z, t), facing: mixAngle(from.facing, to.facing, t), actionT: from.action === to.action ? mix(from.actionT, to.actionT, t) : p.actionT };
    }) as [KeeperView, KeeperView],
  };
}
