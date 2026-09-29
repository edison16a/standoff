import type * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import type { MatchView } from "../../engine/view";
import type { Placement } from "./stoppage";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The goal replay's two angles, like a television replay.
 *
 * The kicker: a low close up in front of and beside the kicker, on the
 * near side, riding along with the run and holding on the strike.
 *
 * The keeper: from just behind the goal line inside the goal, over the
 * keeper's shoulder, following the ball in. The net is behind this
 * camera, so it never crosses the picture, and the lens narrows on the
 * ball while it is far off and opens up as it arrives.
 */
export function replayCam(shot: string, view: MatchView, focus: THREE.Vector3 | undefined, pos: THREE.Vector3, look: THREE.Vector3): Placement | null {
  const b = view.ball;
  if (shot === "replay-kicker") {
    if (!focus) return null;
    const kicker = nearest(view, focus);
    const facing = kicker?.facing ?? 0;
    const fx = Math.cos(facing);
    const fz = Math.sin(facing);
    // Ahead and to one side, whichever side is nearer the cameras, so the stands stay behind the kicker.
    const side = fx >= 0 ? 1 : -1;
    const sx = -fz * side;
    const sz = fx * side;
    pos.set(focus.x + fx * 2.6 + sx * 3, 1.2, focus.z + fz * 2.6 + sz * 3);
    look.set(focus.x * 0.75 + b.x * 0.25, 0.85, focus.z * 0.75 + b.z * 0.25);
    return { fov: 30, rate: 6 };
  }
  if (shot === "replay-keeper") {
    const s = focus && focus.x < 0 ? -1 : 1;
    const keeperZ = focus?.z ?? 0;
    pos.set(s * (PITCH.halfLength + 0.45), 1.45, clamp(keeperZ * 0.35, -1.5, 1.5));
    look.set(b.x, Math.max(0.5, b.y), b.z);
    const d = Math.hypot(b.x - pos.x, b.y - pos.y, b.z - pos.z);
    const fov = clamp((2 * Math.atan(5 / Math.max(0.5, d)) * 180) / Math.PI, 20, 46);
    return { fov, rate: 7 };
  }
  return null;
}

function nearest(view: MatchView, at: THREE.Vector3) {
  let best = view.athletes[0];
  let bestD = Infinity;
  for (const a of view.athletes) {
    const d = Math.hypot(a.x - at.x, a.z - at.z);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}
