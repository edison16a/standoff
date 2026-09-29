import type { Fighter } from "./fighter";
import { dist } from "./vec";

/** A tapped shot that comes a moment early still fires once the gun is ready, or the fighter has risen. */
export const PULL_KEEP = 0.6;
/** Rising from cover, the gun waits until the body is this far up, so the shot clears the bunker. */
const RISEN = 0.2;
/** A player who shot this recently is still in the fight, which holds a peek open. */
const ENGAGED_FOR = 0.5;

export type FireResult = "fired" | "dry" | "wait";

/** Whether a player is still trading fire, which holds their peek open. */
export function humanEngaged(f: Fighter, now: number): boolean {
  return f.trigger.held || now - f.shotAt < ENGAGED_FOR;
}

/**
 * Coming up from behind cover or stepping out round it: the gun would
 * only hit the bunker, so a press waits until the fighter is clear.
 * Holding Crouch means the player wants the shot from where they are.
 */
export function rising(f: Fighter): boolean {
  const b = f.brain;
  if (b.stance !== "peek" || f.crouchHeld) return false;
  const stepping = b.peekAt !== null && dist(f.pos, b.peekAt) > 0.25;
  return f.crouch > RISEN || stepping;
}

/**
 * A player's shoot button, once a step. A press always counts as one
 * pull, kept a moment if the gun or the body is not ready; a held
 * automatic keeps firing.
 */
export function humanTrigger(f: Fighter, now: number, fire: () => FireResult): void {
  const t = f.trigger;
  if (rising(f)) {
    if (t.pulls > 0 && now - t.pulledAt > PULL_KEEP) t.pulls = 0;
    return;
  }
  if (t.pulls > 0) {
    if (fire() !== "wait" || now - t.pulledAt > PULL_KEEP) t.pulls = 0;
    return;
  }
  if (t.held && f.gun.spec.auto) fire();
}
