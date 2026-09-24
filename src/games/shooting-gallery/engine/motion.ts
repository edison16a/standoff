import { LANES, OFFSTAGE_X, POP_RISE } from "./layout";
import { CLEAR_AFTER_S, POP_TIME_S } from "./rules";
import { POP_HALF_SPAN, POP_MIN_APART } from "./spawner";
import type { Target } from "./target";

/** Ducks rock gently on the waves, each to its own beat. */
function bob(target: Target, time: number): number {
  return 0.035 * Math.sin(time * 2.4 + target.id * 1.7);
}

/** A smooth start and stop for the pop up stick. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * Moves one target on by a step. Returns false once it has left the
 * stage and can be dropped. Hit ducks keep riding their chain, lying flat
 * behind the wave, which is how a real gallery clears them away.
 */
export function advance(target: Target, time: number, dt: number, ramp: number): boolean {
  const lane = LANES[target.lane];
  if (target.lane === "pop") return advancePop(target, time, dt, ramp);
  target.x += target.vx * ramp * dt;
  target.y = target.kind === "plate" ? lane.y : lane.y + bob(target, time);
  if (target.hit && target.kind === "plate" && time - target.hit.at > CLEAR_AFTER_S) return false;
  return Math.sign(target.vx) * target.x < OFFSTAGE_X;
}

/**
 * Sliding bullseyes turn back when they close on another one, so two
 * targets never pass through each other or hide one behind the other.
 */
export function keepApart(targets: readonly Target[]): void {
  const pops = targets.filter((t) => t.lane === "pop" && !t.hit);
  for (let i = 0; i < pops.length; i++) {
    for (let j = i + 1; j < pops.length; j++) {
      const a = pops[i]!;
      const b = pops[j]!;
      const gap = b.x - a.x;
      if (Math.abs(gap) >= POP_MIN_APART || (b.vx - a.vx) * gap >= 0) continue;
      // Only the ones moving toward the other turn round, so a still target stays put.
      if (a.vx * gap > 0) a.vx = -a.vx;
      if (b.vx * gap < 0) b.vx = -b.vx;
    }
  }
}

function advancePop(target: Target, time: number, dt: number, ramp: number): boolean {
  const lane = LANES.pop;
  if (target.hit) return time - target.hit.at < CLEAR_AFTER_S;
  target.x += target.vx * ramp * dt;
  // Sliding targets turn back at the ends of their track.
  if (Math.abs(target.x) > POP_HALF_SPAN) {
    target.x = Math.sign(target.x) * POP_HALF_SPAN;
    target.vx = -target.vx;
  }
  const rising = (time - target.born) / POP_TIME_S;
  const sinking = (target.lowerAt + POP_TIME_S - time) / POP_TIME_S;
  target.raise = Math.min(ease(rising), ease(sinking));
  target.y = lane.y - POP_RISE * (1 - target.raise);
  return time < target.lowerAt + POP_TIME_S;
}
