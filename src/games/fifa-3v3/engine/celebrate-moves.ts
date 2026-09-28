import type { Celebration } from "../roster";
import { attackSign, type TeamId } from "../teams";
import { brake } from "./athlete";
import { PITCH } from "./tuning";
import type { Athlete } from "./types";
import { angleDiff, clamp, type Vec2 } from "./vec";

/**
 * The two goal celebrations, timed here so the engine and the drawing
 * agree. The SUI: a last stride, a leap with a half turn in the air, and
 * a landing with the legs wide and the arms thrust down. The knee slide:
 * down onto both knees at full pace, sliding across the grass until the
 * turf stops it.
 */
export const SUI = { takeoff: 0.18, land: 0.8, settle: 1, length: 1.8 } as const;
export const KNEE_SLIDE = { drop: 0.22, friction: 4.6, length: 2.1 } as const;

/** How long the scorer's celebration runs, from its first movement to the pose held at the end. */
export function celebrationLength(kind: Celebration): number {
  return kind === "sui" ? SUI.length : KNEE_SLIDE.length;
}

/**
 * Where the scorer runs off to before celebrating. For the SUI it is the
 * far corner, so they run away from the cameras and the half turn in
 * the air lands them facing them. For the knee slide it is toward the
 * near side, so they slide toward the cameras with room to stop.
 */
export function celebrationSpot(kind: Celebration, team: TeamId): Vec2 {
  const s = attackSign(team);
  if (kind === "sui") return { x: s * (PITCH.halfLength - 5), z: -(PITCH.halfWidth - 3.5) };
  return { x: s * (PITCH.halfLength - 7), z: PITCH.halfWidth - 5 };
}

/** One step of the scorer's celebration, `t` seconds into it. */
export function stepCelebration(a: Athlete, kind: Celebration, t: number, dt: number): void {
  if (kind === "sui") return stepSui(a, t, dt);
  stepKneeSlide(a, t, dt);
}

/** The run carries into the leap and dies on landing. Facing away from the cameras, the half turn does the rest. */
function stepSui(a: Athlete, t: number, dt: number): void {
  const airborne = t > SUI.takeoff && t < SUI.land;
  brake(a, dt, t < SUI.takeoff ? 3 : airborne ? 1.2 : 12);
  const away = -Math.PI / 2;
  a.facing += clamp(angleDiff(a.facing, away), -6 * dt, 6 * dt);
}

/**
 * Down on the knees the body keeps its pace and the grass slows it at a
 * steady rate, like cloth sliding on wet turf. The slide never reaches
 * the boards: it stops short of them.
 */
function stepKneeSlide(a: Athlete, t: number, dt: number): void {
  const speed = Math.hypot(a.vel.x, a.vel.z);
  if (t < dt * 1.5 && speed < 4) {
    // Barely running when it started: the scorer pushes into the slide along their facing.
    a.vel = { x: Math.cos(a.facing) * 5, z: Math.sin(a.facing) * 5 };
  }
  const now = Math.hypot(a.vel.x, a.vel.z);
  const next = Math.max(0, now - KNEE_SLIDE.friction * dt);
  if (now > 1e-6) {
    a.vel.x *= next / now;
    a.vel.z *= next / now;
    a.facing += clamp(angleDiff(a.facing, Math.atan2(a.vel.z, a.vel.x)), -3 * dt, 3 * dt);
  }
  a.pos.x = clamp(a.pos.x + a.vel.x * dt, -PITCH.halfLength + 1.5, PITCH.halfLength - 1.5);
  a.pos.z = clamp(a.pos.z + a.vel.z * dt, -PITCH.halfWidth + 1.5, PITCH.halfWidth - 1.5);
}
