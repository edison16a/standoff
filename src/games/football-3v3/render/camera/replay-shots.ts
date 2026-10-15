import { FIELD } from "../../engine/field";
import type { AthleteView, MatchView } from "../../engine/view";
import { attackSign } from "../../teams";
import type { Aim, Vec } from "./shots";

/** The touchdown replay's camera angles (the host's replay script picks them). */
export type ReplayAngle = "all22" | "qb" | "catch" | "chase" | "endzone";

/** Which angle the touchdown replay wants, who is in it, and which showing of the play it is. */
export interface ReplayShot {
  angle: ReplayAngle;
  passer: number | null;
  scorer: number;
  take: number;
}

function flat(x: number, z: number, fallback: { x: number; z: number }): { x: number; z: number } {
  const l = Math.hypot(x, z);
  return l > 0.3 ? { x: x / l, z: z / l } : fallback;
}

const find = (view: MatchView, id: number | null): AthleteView | undefined => (id === null ? undefined : view.athletes.find((a) => a.id === id));
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

/** High behind the offense, like a coach's film: the line, the routes and the pursuit all in one picture. */
function all22(view: MatchView, sign: number): Aim {
  const b = view.ball;
  // Leans toward the ball across the field, so a run down the sideline stays in the picture.
  const z = b.z * 0.8;
  return {
    pos: { x: b.x - sign * 12, y: 8.5, z },
    look: { x: b.x + sign * 8, y: 0, z: z * 1.05 },
    fov: 46, rate: 2.6, kind: "replay-all22",
  };
}

/** Low over the QB's right shoulder, down the line of the throw: the set, the release and the ball flying away. */
function overQb(view: MatchView, passer: AthleteView, to: AthleteView | undefined, sign: number): Aim {
  const dir = to ? flat(to.x - passer.x, to.z - passer.z, { x: sign, z: 0 }) : { x: sign, z: 0 };
  const right = { x: -dir.z, z: dir.x };
  const ahead = { x: passer.x + dir.x * 16, y: 1, z: passer.z + dir.z * 16 };
  const b = view.ball;
  const look = b.state === "pass" ? mix(ahead, { x: b.x, y: Math.max(1, b.y * 0.8), z: b.z }, 0.45) : ahead;
  return {
    pos: { x: passer.x - dir.x * 3.6 + right.x * 1.1, y: 2.2, z: passer.z - dir.z * 3.6 + right.z * 1.1 },
    look, fov: 42, rate: 4, kind: "replay-qb",
  };
}

/**
 * Downfield of the receiver and off to the middle of the field, at
 * shoulder height: his face, his hands and the ball dropping in, then
 * the turn upfield toward the lens.
 */
function atCatch(view: MatchView, r: AthleteView, sign: number): Aim {
  const side = r.z > 0 ? -1 : 1;
  const b = view.ball;
  const body = { x: r.x, y: 1.2, z: r.z };
  const near = b.state === "pass" && Math.hypot(b.x - r.x, b.z - r.z) < 14;
  return {
    pos: { x: r.x + sign * 7, y: 1.7, z: r.z + side * 5 },
    look: near ? mix(body, { x: b.x, y: b.y, z: b.z }, 0.3) : body,
    fov: 40, rate: 4.5, kind: "replay-catch",
  };
}

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
    fov: 44, rate: 7, kind: "replay-chase",
  };
}

/**
 * At the back of the end zone looking out at the runner coming in. The
 * lens is long while he is far and widens as he arrives, so he fills
 * about the same share of the picture all the way to the line.
 */
function endZone(r: AthleteView, sign: number): Aim {
  const back = sign * (FIELD.goalX + 8.5);
  const pos = { x: back, y: 2.1, z: clamp(r.z * 0.45, -12, 12) };
  const d = Math.max(3, Math.hypot(r.x - pos.x, r.z - pos.z));
  const fov = clamp((2 * Math.atan(2.7 / d) * 180) / Math.PI, 10, 48);
  return { pos, look: { x: r.x, y: 1.05, z: r.z }, fov, rate: 6, kind: "replay-endzone" };
}

/** Where the replay camera wants to be for this shot. */
export function replayAim(view: MatchView, shot: ReplayShot): Aim {
  const scorer = find(view, shot.scorer);
  const passer = find(view, shot.passer);
  const sign = attackSign(scorer?.team ?? view.drive.offense);
  if (shot.angle === "all22" || !scorer) return all22(view, sign);
  if (shot.angle === "qb" && passer) return overQb(view, passer, scorer, sign);
  if (shot.angle === "catch") return atCatch(view, scorer, sign);
  if (shot.angle === "endzone") return endZone(scorer, sign);
  return chase(scorer, sign);
}
