import type { AthleteView, MatchView } from "../../engine/view";
import { attackSign } from "../../teams";
import type { Aim } from "./shots";

/** Which angle the touchdown replay wants, and who is in it. */
export interface ReplayShot {
  camera: "qb" | "ball" | "runner";
  passer: number | null;
  scorer: number;
}

function flat(x: number, z: number, fallback: { x: number; z: number }): { x: number; z: number } {
  const l = Math.hypot(x, z);
  return l > 0.3 ? { x: x / l, z: z / l } : fallback;
}

const find = (view: MatchView, id: number | null): AthleteView | undefined => (id === null ? undefined : view.athletes.find((a) => a.id === id));

/**
 * The touchdown replay's three angles, like a network's replay package.
 *
 * Behind the QB: low over his right shoulder, looking down the line of
 * the throw toward the man it is going to, so the aim and the release
 * fill the picture.
 *
 * The ball: chasing the spiral from just behind and above it, looking
 * where it is headed, so its traced path runs away into the catch.
 *
 * The runner: close behind the scorer and a little up, riding with him
 * as he runs and dodges into the end zone.
 */
export function replayAim(view: MatchView, shot: ReplayShot): Aim {
  const scorer = find(view, shot.scorer);
  const passer = find(view, shot.passer);
  const sign = attackSign(scorer?.team ?? view.drive.offense);
  const downfield = { x: sign, z: 0 };
  if (shot.camera === "qb" && passer) {
    const to = scorer ?? passer;
    const dir = flat(to.x - passer.x, to.z - passer.z, downfield);
    const right = { x: -dir.z, z: dir.x };
    return {
      pos: { x: passer.x - dir.x * 5.2 + right.x * 1.3, y: 3, z: passer.z - dir.z * 5.2 + right.z * 1.3 },
      look: { x: passer.x + dir.x * 18, y: 0.9, z: passer.z + dir.z * 18 },
      fov: 46, rate: 5, kind: "replay-qb",
    };
  }
  if (shot.camera === "ball") {
    const b = view.ball;
    const dir = flat(b.vx, b.vz, scorer ? flat(scorer.x - b.x, scorer.z - b.z, downfield) : downfield);
    return {
      pos: { x: b.x - dir.x * 6.5, y: Math.max(2.2, b.y + 1.6), z: b.z - dir.z * 6.5 },
      look: { x: b.x + dir.x * 6, y: Math.max(0.8, b.y * 0.7), z: b.z + dir.z * 6 },
      fov: 46, rate: 8, kind: "replay-ball",
    };
  }
  const who = scorer ?? view.athletes[0]!;
  const run = flat(who.vx, who.vz, downfield);
  return {
    pos: { x: who.x - run.x * 8, y: 3.6, z: who.z - run.z * 8 + 1.2 },
    look: { x: who.x + run.x * 6, y: 1, z: who.z + run.z * 6 },
    fov: 48, rate: 4, kind: "replay-runner",
  };
}
