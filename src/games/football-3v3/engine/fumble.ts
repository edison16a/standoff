import { isDown } from "./body";
import { advance, newDrive } from "./downs";
import { FIELD, spotZ, xToYard } from "./field";
import { launch } from "./flight";
import type { Match } from "./match";
import { momentumOf } from "./physics/ball-shape";
import { addScore } from "./score";
import { RULES } from "./tuning";
import type { Athlete } from "./types";
import { other } from "../teams";
import type { V2 } from "./vec";
import { afterScore, blowWhistle } from "./whistle";

/**
 * A fumble: a big hit jars the ball out and it is a live ball, bouncing
 * as a real football does. The first player to get to it low enough
 * scoops it up and runs. Out of bounds, or left lying, the officials
 * blow it dead at that spot for the side that had it.
 */
export const FUMBLE = {
  /** The ball is low and slow enough to scoop within this reach. */
  reach: 0.75,
  low: 0.75,
  /** Faster than this past a player it squirts by. */
  fast: 9,
  /** Seconds a loose ball may lie before it is blown dead. */
  dead: 6,
} as const;

const CARRY_HEIGHT = 1.05;

/** The ball comes out of the carrier's arm, knocked along the hit with a wild spin. */
export function popBall(m: Match, carrier: Athlete, hit: V2): void {
  const r = m.rng;
  const pos = { x: carrier.x + Math.sin(carrier.yaw) * 0.25, y: CARRY_HEIGHT, z: carrier.z + Math.cos(carrier.yaw) * 0.25 };
  const push = r.range(2, 4.5);
  const vel = { x: carrier.vx + hit.x * push + r.range(-1.5, 1.5), y: r.range(1.2, 3.2), z: carrier.vz + hit.z * push + r.range(-1.5, 1.5) };
  const f = launch(pos, vel, "spiral", 0, 0);
  f.L = momentumOf(f.q, { x: r.range(-25, 25), y: r.range(-25, 25), z: r.range(-25, 25) });
  m.ball.state = "loose";
  m.ball.holder = null;
  m.ball.flight = f;
  m.ball.pass = null;
  m.ball.fumble = { by: carrier.id, team: carrier.team, at: m.time };
  m.emit({ type: "fumble", id: carrier.id });
}

/** Whoever gets to the loose ball first scoops it up, live. */
function recover(m: Match): Athlete | null {
  const b = m.ball;
  const f = b.flight;
  if (!f || b.pos.y > FUMBLE.low) return null;
  let best: Athlete | null = null;
  let bestD: number = FUMBLE.reach;
  for (const a of m.athletes) {
    if (a.role === "lineman" || isDown(a)) continue;
    const d = Math.hypot(a.x - b.pos.x, a.z - b.pos.z);
    if (d > bestD || Math.hypot(f.vel.x - a.vx, f.vel.z - a.vz) > FUMBLE.fast) continue;
    best = a;
    bestD = d;
  }
  return best;
}

/** Each step of a live loose ball: a recovery, or it dies out of bounds or lying there. */
export function updateFumble(m: Match): void {
  const fumble = m.ball.fumble;
  if (m.phase !== "live" || m.ball.state !== "loose" || !fumble) return;
  const a = recover(m);
  if (a) {
    m.ball.state = "held";
    m.ball.holder = a.id;
    m.ball.flight = null;
    m.ball.fumble = null;
    if (a.team !== m.offense) m.play!.intercepted = true;
    m.emit({ type: "recover", id: a.id, team: a.team, from: fumble.by });
    return;
  }
  const p = m.ball.pos;
  const out = Math.abs(p.z) > FIELD.halfWidth || Math.abs(p.x) > FIELD.endX;
  if (out || m.time - fumble.at > FUMBLE.dead) deadLoose(m, fumble.team);
}

/**
 * A loose ball blown dead: the side that fumbled keeps it where it is.
 * Out the back of the other end zone it is a touchback; dead in its own
 * end zone, a safety.
 */
function deadLoose(m: Match, team: 0 | 1): void {
  const d = m.drive;
  m.ball.fumble = null;
  const yl = xToYard(team, m.ball.pos.x);
  if (yl >= 100) return blowWhistle(m, "touchback", newDrive(other(team), RULES.touchback));
  if (yl <= 0) {
    m.emit({ type: "safety", team: other(team) });
    addScore(m, other(team), 2);
    return blowWhistle(m, "safety", newDrive(other(team), RULES.driveStart));
  }
  const z = spotZ(m.ball.pos.z);
  if (team !== d.offense) return blowWhistle(m, "out", newDrive(team, yl, z));
  if (d.conversion) {
    m.emit({ type: "twoPoint", team: d.offense, good: false });
    return blowWhistle(m, "out", afterScore(m, d.offense));
  }
  const { drive, result } = advance(d, yl, z);
  if (result === "firstDown") m.emit({ type: "firstDown", team });
  if (result === "turnover") m.emit({ type: "turnoverOnDowns", team });
  blowWhistle(m, "out", drive, Math.round(yl - d.los));
}
