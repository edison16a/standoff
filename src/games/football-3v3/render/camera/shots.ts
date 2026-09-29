import { POSTS } from "../../engine/field";
import type { MatchView } from "../../engine/view";
import { attackSign, type TeamId } from "../../teams";

export interface Vec {
  x: number;
  y: number;
  z: number;
}

/** Where the camera wants to be this frame: its spot, what it looks at, and the lens. */
export interface Aim {
  pos: Vec;
  look: Vec;
  fov: number;
  /** How quickly the camera chases this aim, per second. */
  rate: number;
  kind: "behind" | "kick" | "closeup" | "wide";
}

/** Which way the play is going: the carrier's team after a turnover, the offense otherwise. */
export function playSign(view: MatchView): 1 | -1 {
  const holder = view.ball.holder;
  const carrier = holder !== null ? view.athletes.find((a) => a.id === holder) : undefined;
  const team: TeamId = carrier && view.phase === "live" ? carrier.team : view.drive.offense;
  return attackSign(team);
}

/**
 * The Madden camera: high behind the team with the ball, looking down
 * the field over the line. It sits back and a little higher as the ball
 * goes deep so the receivers stay in frame, and drifts toward the
 * middle of the field so a play on the hash still shows both sides.
 */
export function behind(view: MatchView): Aim {
  const s = playSign(view);
  const b = view.ball;
  const presnap = view.phase === "choose" || view.phase === "presnap" || view.phase === "convert";
  const fx = presnap ? view.drive.losX : b.x;
  const fz = presnap ? view.drive.ballZ : b.z;
  const deep = view.phase === "live" && b.state === "pass" ? Math.min(1, Math.hypot(b.vx, b.vz) / 20) : 0;
  const back = 13 + 5 * deep;
  const height = 7 + 3 * deep + Math.max(0, b.y - 3) * 0.4;
  return {
    pos: { x: fx - s * back, y: height, z: fz * 0.55 },
    look: { x: fx + s * (9 + 4 * deep), y: 0.6, z: fz * 0.8 },
    fov: 52,
    rate: presnap ? 2.5 : 4,
    kind: "behind",
  };
}

/**
 * The kicking camera: low behind the kicker looking through the posts
 * (or down the field for a punt), then up and after the ball once it
 * is in the air.
 */
export function kickCam(view: MatchView): Aim {
  const s = attackSign(view.drive.offense);
  const kicker = view.athletes.find((a) => a.id === view.kick?.kicker);
  const kx = kicker?.x ?? view.drive.losX;
  const kz = kicker?.z ?? view.drive.ballZ;
  const b = view.ball;
  const fieldGoal = view.kick?.fieldGoal ?? true;
  const target = fieldGoal ? { x: s * POSTS.x, y: POSTS.crossbar + 2, z: 0 } : { x: kx + s * 40, y: 4, z: kz };
  if (b.state === "kick") {
    // Chase the ball from behind and above, still framing the posts.
    return {
      pos: { x: b.x - s * 12, y: Math.max(3.5, b.y * 0.6 + 3), z: b.z * 0.8 + kz * 0.2 },
      look: fieldGoal ? { x: (b.x + target.x) / 2, y: (b.y + target.y) / 2, z: b.z * 0.5 } : { x: b.x + s * 6, y: b.y * 0.8, z: b.z },
      fov: 50, rate: 5, kind: "kick",
    };
  }
  return { pos: { x: kx - s * 5.5, y: 2.3, z: kz - 1.2 }, look: { x: kx + s * 10, y: 1.8, z: kz * 0.5 + target.z * 0.5 }, fov: 48, rate: 3, kind: "kick" };
}

/** A slow orbit round the scorer while the team celebrates. */
export function closeup(view: MatchView, time: number): Aim {
  const who = view.athletes.find((a) => a.id === view.scorer) ?? view.athletes.find((a) => a.id === view.ball.holder);
  const x = who?.x ?? view.ball.x;
  const z = who?.z ?? view.ball.z;
  const angle = time * 0.25 + (who?.yaw ?? 0);
  return {
    pos: { x: x + Math.sin(angle) * 7.5, y: 2.4, z: z + Math.cos(angle) * 7.5 },
    look: { x, y: 1.2, z },
    fov: 40, rate: 2.2, kind: "closeup",
  };
}

/** High over midfield, for the final whistle. */
export function wide(view: MatchView, time: number): Aim {
  const team = view.winner ?? view.drive.offense;
  const players = view.athletes.filter((a) => a.team === team && a.role !== "lineman");
  const cx = players.reduce((sum, a) => sum + a.x, 0) / Math.max(1, players.length);
  const cz = players.reduce((sum, a) => sum + a.z, 0) / Math.max(1, players.length);
  const angle = time * 0.12;
  return { pos: { x: cx + Math.sin(angle) * 16, y: 6, z: cz + Math.cos(angle) * 16 }, look: { x: cx, y: 1, z: cz }, fov: 45, rate: 1.5, kind: "wide" };
}

/** Picks the shot for the moment of the game. */
export function aimFor(view: MatchView, time: number): Aim {
  if (view.phase === "touchdown") return closeup(view, time);
  if (view.phase === "over") return wide(view, time);
  if (view.phase === "kick") return kickCam(view);
  return behind(view);
}
