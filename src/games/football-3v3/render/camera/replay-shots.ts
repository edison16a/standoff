import type { AthleteView, BallView, MatchView } from "../../engine/view";
import { attackSign } from "../../teams";
import type { Aim } from "./shots";

/** The touchdown replay's camera: one moving shot, tracing the pass or chasing the run (the host's replay script picks it). */
export type ReplayAngle = "trace" | "run";

/** Which shot the touchdown replay wants and who is in it. */
export interface ReplayShot {
  angle: ReplayAngle;
  passer: number | null;
  scorer: number;
}

type Flat = { x: number; z: number };

function flat(x: number, z: number, fallback: Flat): Flat {
  const l = Math.hypot(x, z);
  return l > 0.3 ? { x: x / l, z: z / l } : fallback;
}

const find = (view: MatchView, id: number | null): AthleteView | undefined => (id === null ? undefined : view.athletes.find((a) => a.id === id));

/**
 * Low behind the ball carrier and a little wide, riding with him. It
 * holds him tight: a loose follow trails a man in full stride by a few
 * metres and shrinks him to a speck down the sideline.
 */
function chase(r: AthleteView, sign: number): Aim {
  const run = flat(r.vx, r.vz, { x: sign, z: 0 });
  return {
    pos: { x: r.x - run.x * 6 - run.z * 2.2, y: 2.9, z: r.z - run.z * 6 + run.x * 2.2 },
    look: { x: r.x + run.x * 3, y: 0.9, z: r.z + run.z * 3 },
    fov: 44, rate: 7, kind: "replay-run",
  };
}

/** Behind the ball in the air and above its line, looking down it to where it is headed. */
function behindBall(b: BallView, toward: Flat): Aim {
  const dir = flat(b.vx, b.vz, toward);
  return {
    pos: { x: b.x - dir.x * 7, y: Math.max(2.4, b.y * 0.75 + 2), z: b.z - dir.z * 7 },
    look: { x: b.x + dir.x * 5, y: Math.max(0.8, b.y * 0.7), z: b.z + dir.z * 5 },
    fov: 46, rate: 7, kind: "replay-trace",
  };
}

/** Over the QB's shoulder before the ball goes, looking down the line he is about to throw. */
function overQb(passer: AthleteView, dir: Flat): Aim {
  const right = { x: -dir.z, z: dir.x };
  return {
    pos: { x: passer.x - dir.x * 5 + right.x * 1.2, y: 2.6, z: passer.z - dir.z * 5 + right.z * 1.2 },
    look: { x: passer.x + dir.x * 10, y: 1.1, z: passer.z + dir.z * 10 },
    fov: 46, rate: 7, kind: "replay-trace",
  };
}

/**
 * One camera on the pass, start to finish: over the QB as he sets and
 * throws, then riding behind the ball all the way down into the
 * receiver's hands, then chasing the run in. Each part takes up where
 * the last left the subject (the ball leaves the QB's hand, and lands
 * in the receiver's), so the camera's springs glide from one to the
 * next and the shot never cuts.
 */
function trace(view: MatchView, passer: AthleteView | undefined, scorer: AthleteView, sign: number): Aim {
  const b = view.ball;
  const toScorer = passer ? flat(scorer.x - passer.x, scorer.z - passer.z, { x: sign, z: 0 }) : { x: sign, z: 0 };
  if (b.state === "pass") return behindBall(b, toScorer);
  const held = b.state === "held" ? b.holder : null;
  if (passer && held === passer.id) return overQb(passer, toScorer);
  return { ...chase(scorer, sign), kind: "replay-trace" };
}

/** Where the replay camera wants to be now. */
export function replayAim(view: MatchView, shot: ReplayShot): Aim {
  const scorer = find(view, shot.scorer);
  const sign = attackSign(scorer?.team ?? view.drive.offense);
  if (!scorer) {
    const b = view.ball;
    return { pos: { x: b.x - sign * 12, y: 8.5, z: b.z * 0.8 }, look: { x: b.x + sign * 8, y: 0, z: b.z }, fov: 46, rate: 3, kind: `replay-${shot.angle}` };
  }
  if (shot.angle === "trace") return trace(view, find(view, shot.passer), scorer, sign);
  return chase(scorer, sign);
}
