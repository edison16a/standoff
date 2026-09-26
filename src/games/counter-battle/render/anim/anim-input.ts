import type { Fighter } from "../../engine/fighter";
import type { GunId } from "../../engine/guns";
import type { MatchState } from "../../engine/match";
import { dirOf, turnTo } from "../../engine/vec";

/** Everything the animator needs from one fighter, read fresh each frame. */
export interface AnimInput {
  now: number;
  x: number;
  z: number;
  /** The way the body faces. */
  look: number;
  /** Floor speed and its direction in the body's own space (x to the left, z ahead). */
  speed: number;
  dir: { x: number; z: number };
  /** 0 standing to 1 kneeling. */
  crouch: number;
  /** Out to the side round tall cover: -1 to the right, 1 to the left, 0 not leaning. */
  lean: number;
  /** Where the barrel points: the aim plus the kick, relative to the body's facing. */
  aimYaw: number;
  aimPitch: number;
  /** How far up the gun should be: 1 aiming, 0 carried low. */
  raise: number;
  gun: GunId;
  reloading: boolean;
  /** Share of a magazine reload done, 0 to 1. */
  reloadP: number;
  /** The shotgun's progress through the shell going in now, 0 to 1. */
  shellQ: number;
  shotAt: number;
  hitAt: number;
  alive: boolean;
  diedAt: number;
  /** Game time the fighter's side won the round or match, while it is being celebrated. */
  wonAt: number | null;
}

/** Seconds a shot or a hit keeps the gun up after the fighter stops shooting. */
const HOLD_UP = 1.4;

export function readFighter(f: Fighter, now: number, match: MatchState, wonAt: number | null): AnimInput {
  const speed = Math.hypot(f.vel.x, f.vel.z);
  const fwd = dirOf(f.look);
  // Body space: x to the fighter's left (the world's +x when facing +z), z ahead.
  const local = speed > 1e-3 ? { x: (f.vel.x * fwd.z - f.vel.z * fwd.x) / speed, z: (f.vel.x * fwd.x + f.vel.z * fwd.z) / speed } : { x: 0, z: 1 };
  const b = f.brain;
  let lean = 0;
  if (b.stance === "peek" && b.peekAt) {
    const side = (b.peekAt.x - f.pos.x) * fwd.z - (b.peekAt.z - f.pos.z) * fwd.x;
    // Leaning starts as the step out does, so it reads as looking round the edge.
    lean = Math.abs(side) > 0.05 ? Math.sign(side) : 0;
  }
  const fighting = match.phase === "fight";
  const busy = now - f.shotAt < HOLD_UP || f.trigger.held || now - f.hitAt < 0.6;
  let raise = 0.15;
  if (b.stance === "peek" || busy) raise = 1;
  else if (b.stance === "hide") raise = 0.45;
  // A reload is done with the gun up in front of the chest, where the hands can be seen working.
  if (f.gun.reloading) raise = Math.max(raise, 0.6);
  if (!fighting) raise = match.phase === "countdown" ? 0.35 : 0.2;
  const spec = f.gun.spec;
  const left = f.gun.reloadLeftSeconds;
  const shells = Math.max(0, spec.magazine - f.gun.ammo - 1);
  const shellLeft = spec.shell === null ? 0 : left - shells * spec.shell;
  return {
    now,
    x: f.pos.x,
    z: f.pos.z,
    look: f.look,
    speed,
    dir: local,
    crouch: f.crouch,
    lean,
    aimYaw: turnTo(f.look, f.aim.yaw + f.gun.kick.yaw),
    aimPitch: f.aim.pitch + f.gun.kick.pitch,
    raise,
    gun: f.gun.id,
    reloading: f.gun.reloading,
    reloadP: spec.shell === null && f.gun.reloading ? 1 - left / spec.reload : 0,
    shellQ: spec.shell === null ? 0 : 1 - Math.min(1, Math.max(0, shellLeft / spec.shell)),
    shotAt: f.shotAt,
    hitAt: f.hitAt,
    alive: f.alive,
    diedAt: f.diedAt,
    wonAt,
  };
}
