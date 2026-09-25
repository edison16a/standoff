import { CHARACTERS } from "../roster";
import { decayLaunch } from "./knockback";
import { moveOf } from "./moves";
import { over, type StageDef } from "./stages";
import { ATTACK_MOVE, CHARGE, LAUNCH, MOVEMENT } from "./tuning";
import type { Command, Fighter } from "./types";

/**
 * Moving one fighter for one fixed step: steering, gravity and the
 * launch from hits, then the stage. Deciding what the fighter does is
 * fighter.ts; this only moves the body.
 */

/** Share of gravity felt during a move cast in place in the air. */
const HOVER_SINK = 0.25;

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(target, value + amount);
  return Math.max(target, value - amount);
}

/** Whether the fighter is in a move that holds them still in the air. */
function hovering(f: Fighter): boolean {
  return f.action === "attack" && f.move !== null && moveOf(f.character, f.move).hover === true;
}

/**
 * How much of their normal speed the stick still gives the fighter:
 * all of it when free, a share while swinging most moves or charging,
 * none in a move that roots them, in hurt or dizzy.
 */
function mobility(f: Fighter, grounded: boolean): number {
  if (f.action === "idle" || f.action === "run" || f.action === "air") return 1;
  if (f.action === "charge") return CHARGE.creep * (grounded ? 1 : 2);
  if (f.action !== "attack" || !f.move || moveOf(f.character, f.move).root) return 0;
  return grounded ? ATTACK_MOVE.ground : ATTACK_MOVE.air;
}

/** Sideways speed and falling, before the body moves. */
export function steer(f: Fighter, cmd: Command, dt: number): void {
  const p = CHARACTERS[f.character].physique;
  const stick = Math.abs(cmd.x) >= MOVEMENT.deadZone ? cmd.x : 0;
  const launched = f.launch.x !== 0 || f.launch.y !== 0;
  if (hovering(f)) {
    // Moves cast in place own the sideways speed. In the air they still sink a little, so casting again and again cannot stall forever.
    if (f.ground === null) f.vel.y = Math.max(-p.fall, f.vel.y - p.gravity * HOVER_SINK * dt);
  } else if (f.ground !== null) {
    const free = f.action === "idle" || f.action === "run";
    const share = mobility(f, true);
    if (free) f.vel.x = approach(f.vel.x, stick * p.run, p.accel * dt);
    // Lunges keep sliding a little toward the walk the stick asks for; everything else stops quickly.
    else f.vel.x = approach(f.vel.x, stick * p.run * share, p.accel * (f.action === "attack" || f.action === "charge" ? 0.4 : 1) * dt);
  } else {
    const launch = f.action === "hurt" ? LAUNCH.steer : 0;
    const share = mobility(f, false);
    // A rooted move in the air keeps its momentum; it just cannot be steered.
    const control = f.action === "hurt" ? launch : share > 0 ? 1 : 0;
    const top = f.action === "hurt" ? 1 : share;
    f.vel.x = approach(f.vel.x, stick * p.air * top, p.airAccel * control * dt);
    // Launches fly straight while they last; gravity takes over as they fade.
    if (!launched) {
      const fastFall = cmd.y <= -MOVEMENT.flick && f.vel.y < 2 && (f.action === "air" || f.action === "attack");
      f.vel.y = fastFall ? -p.fastFall : Math.max(-p.fall, f.vel.y - p.gravity * dt);
    }
  }
  decayLaunch(f.launch, dt);
}

export interface Contact {
  /** The surface landed on this step, if any. */
  landed: number | null;
  /** The speed coming down, for bounces. */
  impact: number;
  /** Walked or slid off the edge of the surface stood on. */
  leftGround: boolean;
}

/** Moves the body and resolves the stage. */
export function moveBody(f: Fighter, stage: StageDef, dt: number): Contact {
  const p = CHARACTERS[f.character].physique;
  const half = p.width / 2;
  const vx = f.vel.x + f.launch.x;
  const vy = f.vel.y + f.launch.y;
  const prev = { x: f.pos.x, y: f.pos.y };
  const contact: Contact = { landed: null, impact: 0, leftGround: false };

  if (f.ground !== null) {
    // Standing: slide along the surface, and step off if it ends.
    f.pos.x += vx * dt;
    const surface = stage.surfaces[f.ground]!;
    if (vy > 0.01) {
      f.ground = null;
      f.pos.y += vy * dt;
      contact.leftGround = true;
    } else if (!over(surface, f.pos.x)) {
      f.ground = null;
      contact.leftGround = true;
    } else f.pos.y = surface.top;
    return contact;
  }

  f.pos.x += vx * dt;
  f.pos.y += vy * dt;
  stage.surfaces.forEach((s, i) => {
    if (vy <= 0 && prev.y >= s.top - 1e-6 && f.pos.y <= s.top && over(s, f.pos.x)) {
      if (s.bottom === null && f.dropping > 0) return;
      if (contact.landed !== null && stage.surfaces[contact.landed]!.top >= s.top) return;
      contact.landed = i;
      contact.impact = -vy;
    }
    if (s.bottom === null) return;
    // Solid blocks stop bodies from the sides and from below.
    const inside = f.pos.x + half > s.x1 && f.pos.x - half < s.x2 && f.pos.y < s.top && f.pos.y + p.height > s.bottom;
    if (!inside || contact.landed === i) return;
    if (prev.y + p.height <= s.bottom + 1e-6) {
      f.pos.y = s.bottom - p.height;
      f.vel.y = Math.min(0, f.vel.y);
      f.launch.y = Math.min(0, f.launch.y);
    } else {
      f.pos.x = prev.x <= (s.x1 + s.x2) / 2 ? s.x1 - half : s.x2 + half;
      f.vel.x = 0;
      f.launch.x *= -0.3;
    }
  });
  if (contact.landed !== null) f.pos.y = stage.surfaces[contact.landed]!.top;
  return contact;
}

/** Whether the fighter stands on a platform they can drop through. */
export function onPassThrough(f: Fighter, stage: StageDef): boolean {
  return f.ground !== null && stage.surfaces[f.ground]!.bottom === null;
}
