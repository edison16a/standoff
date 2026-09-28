import { charOf } from "../engine/athlete";
import type { Match } from "../engine/match";
import { RIM } from "../engine/tuning";
import type { V3 } from "../engine/vec";

export interface ReplayCamera {
  pos: V3;
  look: V3;
  fov: number;
}

interface Cast {
  scorer: number;
  defender: number;
}

/**
 * Where the replay's camera sits. The scorer's view is just behind and
 * over the right shoulder of the scorer, at eye height, looking at the
 * rim with the ball in the frame. The defender's view is behind the man
 * who guarded him, looking at the scorer as he rises. Both follow
 * smoothly, so a jump or a drive swings the camera like a person's head.
 */
export function replayCamera(view: "scorer" | "defender", m: Match, cast: Cast, last: ReplayCamera | null, dt: number): ReplayCamera {
  const s = m.athletes[cast.scorer]!;
  const d = m.athletes[cast.defender] ?? s;
  const ball = m.ball.pos;
  let want: ReplayCamera;
  if (view === "scorer") {
    const toX = RIM.x - s.x;
    const toZ = RIM.z - s.z;
    const l = Math.hypot(toX, toZ) || 1;
    const fx = toX / l;
    const fz = toZ / l;
    const eye = s.y + charOf(s).build.height * 0.98 + 0.2;
    want = {
      pos: { x: s.x - fx * 1.7 - fz * 0.45, y: eye, z: s.z - fz * 1.7 + fx * 0.45 },
      look: mix({ x: RIM.x, y: RIM.y - 0.2, z: RIM.z }, ball, 0.35),
      fov: 54,
    };
  } else {
    const toX = s.x - d.x;
    const toZ = s.z - d.z;
    const l = Math.hypot(toX, toZ) || 1;
    const fx = toX / l;
    const fz = toZ / l;
    const eye = d.y + charOf(d).build.height * 0.95 + 0.25;
    want = {
      pos: { x: d.x - fx * 1.5 + fz * 0.35, y: eye, z: d.z - fz * 1.5 - fx * 0.35 },
      look: mix({ x: s.x, y: s.y + charOf(s).build.height * 0.75, z: s.z }, ball, 0.45),
      fov: 50,
    };
  }
  if (!last) return want;
  const k = 1 - Math.exp(-6 * Math.min(0.1, dt));
  return { pos: mix(last.pos, want.pos, k), look: mix(last.look, want.look, k * 1.3 > 1 ? 1 : k * 1.3), fov: want.fov };
}

function mix(a: V3, b: V3, t: number): V3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
