import { carry } from "./ball-carry";
import { tossFrom, type Toss } from "./check-toss";
import type { Match } from "./match";
import { aimTimed } from "./physics/aim";
import { stepBall } from "./physics/world";
import { COURT, FREE_THROW as FT } from "./tuning";
import { angleDiff, clamp, lerp, yawOf, type V2, type V3 } from "./vec";

/**
 * The official who works the free throws. He comes on at the whistle
 * beside the play, walks to his spot on the baseline while the players
 * line up, and between shots goes and gets the ball, walks it up the
 * lane and bounce passes it back to the shooter. He is not a player:
 * nobody bumps into him, and the renderer draws him where this says.
 */

export type OfficialAct = "stand" | "scoop" | "pass";

export interface Official {
  x: number;
  z: number;
  /** Where his chest faces, radians as the players use. */
  yaw: number;
  /** Ground speed this step, for the stride. */
  speed: number;
  holding: boolean;
  act: OfficialAct;
  /** Seconds into `act`. */
  actT: number;
  /** A ball that got away, thrown back to his hands from courtside. */
  incoming: { t: number; dur: number } | null;
}

export const REF = {
  /** The lead official's spot: on the baseline beside the basket, clear of the shot. */
  base: { x: 1.5, z: -0.45 } as V2,
  /** Where he stops in the lane to bounce the ball up to the shooter. */
  pass: { x: 0.45, z: FT.lineZ - 2.7 } as V2,
  walk: 1.7,
  jog: 3.2,
  /** Back out of the lane briskly, so he is clear before the shot. */
  back: 2.8,
  /** He reaches a ball this close, once it is down at his hands. */
  reach: 0.55,
  reachHeight: 1.35,
  /** Bending for it, and the push of the bounce pass. */
  scoop: 0.3,
  passAt: 0.18,
  passEnd: 0.45,
  /** Past this long chasing a ball, it is thrown in to him. */
  giveUp: 2.8,
} as const;

/** Where the referee stands to make a call: beside the play on the camera's side, as the renderer first places him. */
export function callSpot(spot: V2): { x: number; z: number; yaw: number } {
  const side = spot.x > 0 ? -1 : 1;
  const x = clamp(spot.x + side * 1.7, -COURT.halfWidth + 0.6, COURT.halfWidth - 0.6);
  const z = clamp(spot.z + 1.6, 1.2, COURT.depth + 0.8);
  return { x, z, yaw: angleDiff(0, yawOf(spot.x - x, spot.z - z)) * 0.4 };
}

export function newOfficial(at: V2): Official {
  const s = callSpot(at);
  return { x: s.x, z: s.z, yaw: s.yaw, speed: 0, holding: false, act: "stand", actT: 0, incoming: null };
}

/** The ball in his two hands at the chest, just in front of him. */
export function refHands(o: Official): V3 {
  return { x: o.x + Math.sin(o.yaw) * 0.3, y: 1.12, z: o.z + Math.cos(o.yaw) * 0.3 };
}

/** Walks him toward `to` at `pace`, turning to the way he goes, and returns how far is left. */
export function walkOfficial(o: Official, to: V2, pace: number, dt: number): number {
  const dx = to.x - o.x;
  const dz = to.z - o.z;
  const d = Math.hypot(dx, dz);
  // Easing into the spot: no sudden stop from a jog.
  const speed = Math.min(pace, d * 3);
  const step = Math.min(d, speed * dt);
  o.speed = dt > 0 ? step / dt : 0;
  if (d < 1e-4) return 0;
  o.x += (dx / d) * step;
  o.z += (dz / d) * step;
  if (step > 1e-4) turnTo(o, yawOf(dx, dz), dt);
  return d - step;
}

/** Turns him on the spot toward a yaw, quickly but not in one frame. */
export function turnTo(o: Official, yaw: number, dt: number): void {
  o.yaw += angleDiff(o.yaw, yaw) * Math.min(1, dt * 8);
}

function startAct(o: Official, act: OfficialAct): void {
  o.act = act;
  o.actT = 0;
}

/**
 * Goes and gets the loose ball. Returns true once it is in his hands.
 * A ball he cannot reach in time, or one gone off the floor, is thrown
 * in to him the way a ball kid would.
 */
export function collectBall(m: Match, o: Official, t: number, dt: number): boolean {
  const b = m.ball;
  o.actT += dt;
  if (o.incoming) return catchThrown(m, o, dt);
  const target = { x: clamp(b.pos.x, -COURT.halfWidth, COURT.halfWidth), z: clamp(b.pos.z, -0.6, COURT.depth) };
  const left = walkOfficial(o, target, REF.jog, dt);
  const low = b.pos.y < REF.reachHeight;
  if (left < REF.reach && low && o.act !== "scoop") startAct(o, "scoop");
  if (o.act === "scoop" && o.actT >= REF.scoop * 0.5) {
    o.holding = true;
    b.mode = "held";
    b.holder = null;
    return true;
  }
  if (t > REF.giveUp && o.act !== "scoop") {
    const hands = refHands(o);
    const dur = clamp(Math.hypot(hands.x - b.pos.x, hands.z - b.pos.z) / 8, 0.45, 1);
    b.mode = "flight";
    b.vel = aimTimed(b.pos, hands, dur, { x: 0, y: 0, z: 0 });
    b.w = { x: 0, y: 0, z: 0 };
    o.incoming = { t: 0, dur };
  }
  return false;
}

function catchThrown(m: Match, o: Official, dt: number): boolean {
  const inc = o.incoming!;
  inc.t += dt;
  o.speed = 0;
  stepBall(m.ball, dt, []);
  if (inc.t < inc.dur) return false;
  o.incoming = null;
  o.holding = true;
  m.ball.mode = "held";
  m.ball.holder = null;
  return true;
}

/** Keeps the ball in his hands, sliding in from wherever he picked it up. */
export function holdForOfficial(m: Match, o: Official, dt: number): void {
  const b = m.ball;
  const hands = refHands(o);
  // Coming up off the floor into the hands over the scoop, not in one frame.
  const k = o.act === "scoop" ? clamp(o.actT / REF.scoop, 0, 1) : 1;
  carry(m, { x: lerp(b.pos.x, hands.x, k), y: lerp(b.pos.y, hands.y, k), z: lerp(b.pos.z, hands.z, k) }, dt);
  b.hand = "held";
  o.actT += dt;
  if (o.act === "scoop" && o.actT >= REF.scoop) startAct(o, "stand");
}

/** The bounce pass up the lane to the shooter, let go at the snap of the arms. Returns the toss once it is away. */
export function bouncePass(m: Match, o: Official, shooter: number, dt: number): Toss | null {
  const a = m.athletes[shooter]!;
  if (o.act !== "pass") startAct(o, "pass");
  o.actT += dt;
  o.speed = 0;
  turnTo(o, yawOf(a.x - o.x, a.z - o.z), dt);
  if (o.actT < REF.passAt) {
    carry(m, refHands(o), dt);
    return null;
  }
  o.holding = false;
  const hands = refHands(o);
  return tossFrom(m, { x: hands.x, y: hands.y - 0.15, z: hands.z }, a, true);
}

/** After the pass, the arms come back and he walks back to the baseline. */
export function settleOfficial(o: Official, face: V2, dt: number): void {
  if (o.act === "pass") {
    o.actT += dt;
    o.speed = 0;
    if (o.actT < REF.passEnd) return;
    startAct(o, "stand");
  }
  const left = walkOfficial(o, REF.base, REF.back, dt);
  if (left < 0.05) turnTo(o, yawOf(face.x - o.x, face.z - o.z), dt);
}
