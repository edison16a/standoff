import { BUILDS, type BuildSpec, type BuildId } from "../builds";
import { BODY, CONTACT } from "./body/body-spec";
import { collide, type BodyHit } from "./body/contact";
import { powerPerKg } from "./body/mass";
import { clampToCourt } from "./court";
import type { MatchEvent } from "./events";
import { steer } from "./steer";
import { STEPBACK } from "./stepback";
import { MOVE } from "./tuning";
import type { Athlete, TeamId } from "./types";
import { angleDiff, clamp, yawOf } from "./vec";

export function createAthlete(id: number, team: TeamId, slot: number, build: BuildId, seat: number | null): Athlete {
  return {
    id, team, slot, build, seat, auto: seat === null,
    x: 0, z: 8, vx: 0, vz: 0, y: 0, yaw: Math.PI,
    move: { x: 0, z: 0 },
    stick: { x: 0, z: 0 },
    guard: false,
    guardAim: null,
    guardMan: null,
    action: { kind: "none" },
    stealCd: 0, blockCd: 0, grabCd: 0, whiff: 0, squeakCd: 0, plant: 0, recover: 0, moveCd: 0, moveHeat: 0,
    streak: 0, onFire: false, dribble: 0, dribbleHand: 1, dribbleSide: 1, crossCd: 0, crossArmed: true, pocket: 0, calledAt: -99, cheer: null,
    box: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, made: 0, attempts: 0, threes: 0, dunks: 0, freeMade: 0, freeAttempts: 0 },
  };
}

export const buildOf = (a: Athlete): BuildSpec => BUILDS[a.build];

export function topSpeed(a: Athlete, withBall: boolean): number {
  const base = MOVE.baseSpeed + buildOf(a).stats.speed * MOVE.perSpeed;
  // Off balance after a whiff or a beaten move, and still gathering after a landing, a player is slow.
  const hurt = (a.whiff > 0 ? 0.45 : 1) * (a.recover > 0 ? 0.55 : 1);
  return base * (withBall ? MOVE.withBall : 1) * hurt * (a.onFire ? 1.06 : 1);
}

/** How high a hand gets standing flat footed: roughly 1.33 times height, more for long arms. */
export function standingReach(a: Athlete): number {
  const c = buildOf(a);
  return c.body.height * (1.27 + c.body.reach * 0.06);
}

export function bodyRadius(a: Athlete): number {
  return MOVE.radius * (0.9 + buildOf(a).body.width * 0.12);
}

/** Legs are free unless the player is shooting, flying at the rim or on the floor. */
export function canRun(a: Athlete): boolean {
  const k = a.action.kind;
  return k === "none" || k === "pass" || k === "steal" || (k === "block" && a.y < 0.05);
}

export function airborne(a: Athlete): boolean {
  return a.y > 0.08;
}

/** A dribble move carries the player itself, a jump keeps the run it left the floor with, and so does a stepback hop. */
const carried = (a: Athlete) =>
  a.action.kind === "move" ||
  (a.action.kind === "block" && a.y > 0.02) ||
  (a.action.kind === "shoot" && !!a.action.step && a.action.t < STEPBACK.air) ||
  // A floater is let go on the run: in the air the body carries on at the speed it left the floor with.
  (a.action.kind === "shoot" && !!a.action.float && a.y > 0.02);

/** Runs toward the stick with momentum (see `steer.ts`), and turns the body to match. */
export function moveAthlete(a: Athlete, dt: number, hasBall: boolean, face: { x: number; z: number } | null, events: MatchEvent[]): void {
  a.squeakCd = Math.max(0, a.squeakCd - dt);
  a.plant = Math.max(0, a.plant - dt);
  a.recover = Math.max(0, a.recover - dt);
  const free = canRun(a);
  if (!carried(a)) {
    const speed = topSpeed(a, hasBall);
    const tx = free ? a.move.x * speed : 0;
    const tz = free ? a.move.z * speed : 0;
    // Stopping to shoot is a jump stop on both feet, which brakes harder than a run, so jumpers go up on balance.
    const legs = { power: powerPerKg(a) * (hasBall ? BODY.ballPower : 1), grip: hasBall ? BODY.ballGrip : 1, brake: free ? 1 : BODY.plantTraction };
    const { planted } = steer(a, tx, tz, dt, legs);
    if (planted && a.squeakCd <= 0) {
      events.push({ type: "squeak", id: a.id });
      a.squeakCd = 0.4;
    }
  }
  const moving = Math.hypot(a.vx, a.vz);
  a.x += a.vx * dt;
  a.z += a.vz * dt;
  const p = clampToCourt(a, bodyRadius(a));
  if (p.x !== a.x) a.vx = 0;
  if (p.z !== a.z) a.vz = 0;
  a.x = p.x;
  a.z = p.z;
  if (carried(a)) return;

  let want = a.yaw;
  if (face) want = yawOf(face.x - a.x, face.z - a.z);
  else if (moving > 0.6) want = yawOf(a.vx, a.vz);
  // The body comes round quick; with the ball the dribble has to come round too.
  const turnRate = (a.action.kind !== "none" ? 6 : hasBall ? 7.5 : 10) * dt;
  a.yaw += clamp(angleDiff(a.yaw, want), -turnRate, turnRate);
}

/**
 * Players who run into each other: pushed apart by weight and trading
 * momentum (see `body/contact.ts`), so a screen stops a defender and a
 * big man holds his spot. A hard hit leaves the one it rocked with slow
 * legs for a moment, and `onHit` hears every real hit, for the referee.
 */
export function separate(athletes: readonly Athlete[], events: MatchEvent[], bumpCd: Map<string, number>, onHit?: (a: Athlete, b: Athlete, hit: BodyHit) => void): void {
  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a = athletes[i]!;
      const b = athletes[j]!;
      // A player flying at the rim sails over whoever is below.
      if (a.action.kind === "drive" && airborne(a)) continue;
      if (b.action.kind === "drive" && airborne(b)) continue;
      const hit = collide(a, b, bodyRadius(a), bodyRadius(b));
      if (!hit || hit.closing <= 0) continue;
      rock(a, hit.dvA);
      rock(b, hit.dvB);
      onHit?.(a, b, hit);
      const key = `${a.id}:${b.id}`;
      if (hit.closing > 3.2 && (bumpCd.get(key) ?? 0) <= 0) {
        events.push({ type: "bump", a: a.id, b: b.id, power: Math.min(1, hit.closing / 7) });
        bumpCd.set(key, 0.6);
      }
    }
  }
}

/** A big change of speed in one hit leaves the legs gathering, as after a landing. */
function rock(a: Athlete, dv: number): void {
  if (dv > CONTACT.stagger && a.y < 0.02) a.recover = Math.max(a.recover, Math.min(0.35, dv * 0.06));
}
