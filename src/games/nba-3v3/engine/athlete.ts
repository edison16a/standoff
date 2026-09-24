import { CHARACTERS, type Character, type CharacterId } from "../roster";
import { clampToCourt } from "./court";
import type { MatchEvent } from "./events";
import { MOVE } from "./tuning";
import type { Athlete, TeamId } from "./types";
import { angleDiff, clamp, yawOf } from "./vec";

export function createAthlete(id: number, team: TeamId, slot: number, character: CharacterId, seat: number | null): Athlete {
  return {
    id, team, slot, character, seat, auto: seat === null,
    x: 0, z: 8, vx: 0, vz: 0, y: 0, yaw: Math.PI,
    move: { x: 0, z: 0 },
    action: { kind: "none" },
    stealCd: 0, blockCd: 0, grabCd: 0, whiff: 0, squeakCd: 0,
    streak: 0, onFire: false, dribble: 0, calledAt: -99,
    box: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, made: 0, attempts: 0, threes: 0, dunks: 0 },
  };
}

export const charOf = (a: Athlete): Character => CHARACTERS[a.character];

export function topSpeed(a: Athlete, withBall: boolean): number {
  const base = MOVE.baseSpeed + charOf(a).stats.speed * MOVE.perSpeed;
  return base * (withBall ? MOVE.withBall : 1) * (a.whiff > 0 ? 0.45 : 1) * (a.onFire ? 1.06 : 1);
}

/** How high a hand gets standing flat footed: roughly 1.33 times height, more for long arms. */
export function standingReach(a: Athlete): number {
  const c = charOf(a);
  return c.build.height * (1.27 + c.build.reach * 0.06);
}

/** Heavier players win contact: strength counts most, then sheer size. */
export function mass(a: Athlete): number {
  const c = charOf(a);
  return 1 + c.stats.strength * 0.12 + (c.build.bulk - 1) * 0.8 + (c.build.height - 2) * 0.6;
}

export function bodyRadius(a: Athlete): number {
  return MOVE.radius * (0.9 + charOf(a).build.width * 0.12);
}

/** Legs are free unless the player is shooting, flying at the rim or on the floor. */
export function canRun(a: Athlete): boolean {
  const k = a.action.kind;
  return k === "none" || k === "pass" || k === "steal" || (k === "block" && a.y < 0.05);
}

export function airborne(a: Athlete): boolean {
  return a.y > 0.08;
}

/** Runs toward the stick with a quick but not instant change of pace, and turns the body to match. */
export function moveAthlete(a: Athlete, dt: number, hasBall: boolean, face: { x: number; z: number } | null, events: MatchEvent[]): void {
  a.squeakCd = Math.max(0, a.squeakCd - dt);
  const free = canRun(a);
  const speed = topSpeed(a, hasBall);
  const tx = free ? a.move.x * speed : 0;
  const tz = free ? a.move.z * speed : 0;
  const dx = tx - a.vx;
  const dz = tz - a.vz;
  const need = Math.hypot(dx, dz);
  // Stopping to shoot is sharper than running, so jumpers go up on balance.
  const accel = MOVE.accel * (free ? 1 : 1.6) * dt;
  if (need > 1e-6) {
    const k = Math.min(1, accel / need);
    a.vx += dx * k;
    a.vz += dz * k;
  }
  const moving = Math.hypot(a.vx, a.vz);
  if (free && moving > 3 && Math.hypot(tx, tz) > 1 && a.squeakCd <= 0) {
    const turn = Math.abs(angleDiff(yawOf(a.vx, a.vz), yawOf(tx, tz)));
    if (turn > 1.4) {
      events.push({ type: "squeak", id: a.id });
      a.squeakCd = 0.4;
    }
  }
  a.x += a.vx * dt;
  a.z += a.vz * dt;
  const p = clampToCourt(a, bodyRadius(a));
  if (p.x !== a.x) a.vx = 0;
  if (p.z !== a.z) a.vz = 0;
  a.x = p.x;
  a.z = p.z;

  let want = a.yaw;
  if (face) want = yawOf(face.x - a.x, face.z - a.z);
  else if (moving > 0.6) want = yawOf(a.vx, a.vz);
  const turnRate = (a.action.kind === "none" ? 10 : 6) * dt;
  a.yaw += clamp(angleDiff(a.yaw, want), -turnRate, turnRate);
}

/**
 * Pushes overlapping players apart. The heavier player gives less
 * ground, which is how strength wins battles in the post.
 */
export function separate(athletes: readonly Athlete[], events: MatchEvent[], bumpCd: Map<string, number>): void {
  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a = athletes[i]!;
      const b = athletes[j]!;
      // A player flying at the rim sails over whoever is below.
      if (a.action.kind === "drive" && airborne(a)) continue;
      if (b.action.kind === "drive" && airborne(b)) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      const min = bodyRadius(a) + bodyRadius(b);
      if (d >= min || d < 1e-6) continue;
      const overlap = min - d;
      const ma = mass(a);
      const mb = mass(b);
      const nx = dx / d;
      const nz = dz / d;
      const shareA = mb / (ma + mb);
      a.x -= nx * overlap * shareA;
      a.z -= nz * overlap * shareA;
      b.x += nx * overlap * (1 - shareA);
      b.z += nz * overlap * (1 - shareA);
      const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      const key = `${a.id}:${b.id}`;
      if (closing > 3.2 && (bumpCd.get(key) ?? 0) <= 0) {
        events.push({ type: "bump", a: a.id, b: b.id, power: Math.min(1, closing / 7) });
        bumpCd.set(key, 0.6);
      }
    }
  }
}
