import { moveOf, type Hitbox, type Move, type MoveKey } from "./moves";
import { turnFor } from "./select";
import type { Fighter, MatchState } from "./types";

/**
 * Starting and playing out moves. Hitting is combat.ts; this runs the
 * move's own timeline: lunges and leaps on their frames, projectiles on
 * theirs, and the end of the move.
 */

/** Whether the fighter may start this move now. Recovery works once per trip into the air. */
export function canStart(f: Fighter, key: MoveKey): boolean {
  if (key === "ult" && f.ult < 1) return false;
  const move = moveOf(f.character, key);
  return !(move.recovery && f.ground === null && f.recoveryUsed);
}

export function startMove(state: MatchState, f: Fighter, key: MoveKey, x: number): void {
  const move = moveOf(f.character, key);
  const turn = turnFor(key, x, f.ground !== null);
  if (turn !== null) f.facing = turn;
  f.action = "attack";
  f.frame = 0;
  f.move = key;
  f.swing++;
  f.struck = [];
  f.buffer = null;
  if (move.hover) {
    f.vel = { x: 0, y: 0 };
    f.launch = { x: 0, y: 0 };
  }
  if (move.recovery) {
    f.recoveryUsed = true;
    f.airJumps = 0;
  }
  if (key === "ult") {
    f.ult = 0;
    f.stats.ults++;
    state.events.push({ type: "ult", id: f.id });
  }
  state.events.push({ type: "swing", id: f.id, move: key });
}

/** Plays one frame of the fighter's move. Returns false once the move is over. */
export function advanceMove(state: MatchState, f: Fighter): boolean {
  if (!f.move) return false;
  const move = moveOf(f.character, f.move);
  f.frame++;
  if (f.frame > move.frames) {
    f.move = null;
    return false;
  }
  for (const m of move.motion ?? []) {
    if (m.frame !== f.frame) continue;
    const vx = (m.vx ?? 0) * f.facing;
    if (m.set) {
      if (m.vx !== undefined) f.vel.x = vx;
      if (m.vy !== undefined) f.vel.y = m.vy;
    } else {
      f.vel.x += vx;
      f.vel.y += m.vy ?? 0;
    }
    if ((m.vy ?? 0) > 0) f.ground = null;
  }
  for (const p of move.projectiles ?? []) {
    if (p.frame !== f.frame) continue;
    const id = state.nextProjectile++;
    state.projectiles.push({
      id,
      owner: f.id,
      pos: { x: f.pos.x + p.x * f.facing, y: f.pos.y + p.y },
      vel: { x: p.vx * f.facing, y: p.vy },
      r: p.r,
      life: p.life,
      hit: { damage: p.damage, base: p.base, growth: p.growth, angle: p.angle },
    });
    state.events.push({ type: "projectile", id, owner: f.id });
  }
  return true;
}

/** The fighter's hitboxes that are live this frame. */
export function liveHitboxes(f: Fighter): { move: Move; boxes: Hitbox[] } | null {
  if (f.action !== "attack" || !f.move || f.freeze > 0) return null;
  const move = moveOf(f.character, f.move);
  const boxes = move.hitboxes.filter((b) => f.frame >= b.from && f.frame <= b.to);
  return boxes.length ? { move, boxes } : null;
}

/** Whether a frame of the current move is inside one of its windows, like armor. */
export function inWindow(f: Fighter, window: "armor" | "invincible"): boolean {
  if (f.action !== "attack" || !f.move) return false;
  const span = moveOf(f.character, f.move)[window];
  return span !== undefined && f.frame >= span[0] && f.frame <= span[1];
}
