import type { Emit } from "./events";
import type { Kart } from "./kart";
import { launch, nearestAhead, nearestBehind, type Projectile, type ThrownKind } from "./projectiles";
import type { Track } from "./track";
import { EFFECTS } from "./tuning";

/**
 * Something struck a kart. Protection after a respawn ignores it, a
 * shield soaks it up and breaks, otherwise the kart spins out or its
 * wheels ice over.
 */
export function strike(kart: Kart, by: ThrownKind | "obstacle", from: number | null, emit: Emit): void {
  if (kart.timers.grace > 0 || kart.race.finished) return;
  if (kart.timers.shield > 0) {
    kart.timers.shield = 0;
    emit({ type: "blocked", kart: kart.id });
    return;
  }
  if (by === "ice") {
    kart.timers.ice = EFFECTS.ice;
  } else {
    // A spin already under way is not restarted, so two hits never chain into a long stun.
    if (kart.timers.stun > 0) return;
    kart.timers.stun = by === "orb" ? EFFECTS.stun : EFFECTS.obstacleStun;
    kart.timers.boost = 0;
    kart.drift = 0;
    kart.driftTime = 0;
  }
  emit({ type: "hit", kart: kart.id, by, from });
}

/**
 * Fires the held item. Returns a new throw when there is one. The throw
 * picks the nearest kart ahead it can see; the leader's ice goes back
 * at the kart behind instead, and the leader's orb flies on down the
 * road for anyone in its way.
 */
export function fireItem(kart: Kart, karts: readonly Kart[], track: Track, nextId: number, time: number, emit: Emit): Projectile | null {
  const item = kart.item;
  if (!item || time < kart.itemReadyAt || kart.timers.stun > 0 || kart.race.finished) return null;
  kart.item = null;
  emit({ type: "use", kart: kart.id, item });
  switch (item) {
    case "nitro":
      kart.timers.boost = Math.max(kart.timers.boost, EFFECTS.nitro);
      emit({ type: "boost", kart: kart.id, source: "nitro" });
      return null;
    case "ghost":
      kart.timers.ghost = EFFECTS.invisible;
      return null;
    case "shield":
      kart.timers.shield = EFFECTS.shield;
      return null;
    case "orb":
      return launch(nextId, "orb", kart, nearestAhead(kart, karts), track);
    case "ice":
      return launch(nextId, "ice", kart, nearestAhead(kart, karts) ?? nearestBehind(kart, karts), track);
  }
}

/** Counts every effect down by one step. */
export function tickTimers(kart: Kart, dt: number): void {
  const t = kart.timers;
  const spinning = t.stun > 0;
  t.stun = Math.max(0, t.stun - dt);
  // A moment of protection as a spin ends, so a crab sweeping back over a
  // kart that has barely got going cannot spin it out again and again.
  if (spinning && t.stun === 0) t.grace = Math.max(t.grace, EFFECTS.afterSpin);
  t.ice = Math.max(0, t.ice - dt);
  t.boost = Math.max(0, t.boost - dt);
  t.ghost = Math.max(0, t.ghost - dt);
  t.shield = Math.max(0, t.shield - dt);
  t.grace = Math.max(0, t.grace - dt);
}
