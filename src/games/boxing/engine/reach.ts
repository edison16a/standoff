import type { ActivePunch } from "./fighter";
import { RULES } from "./rules";
import type { HeadSpot } from "./types";

/** How squarely a punch finds its target: 1 clean, less a glancing blow, 0 a miss, and which way it was dodged. */
export interface Contact {
  amount: number;
  dodge: "duck" | "slip" | null;
}

/** A glancing blow that finds less than this much of the head is a miss. */
const GRAZE = 0.3;

/**
 * Moves a punch's aim toward the head it is going for. Through the wind
 * up the aim follows the head, a little behind, so drifting about or
 * dodging too early does not help. Once the glove leaves it is set, so a
 * quick move of the head in that last moment takes it out of the way.
 */
export function followAim(punch: ActivePunch, head: HeadSpot, now: number, dtMs: number): void {
  if (punch.resolved || now >= punch.launchAt) return;
  const k = 1 - Math.exp(-dtMs / RULES.aimFollowMs);
  punch.aim.x += (head.x - punch.aim.x) * k;
  punch.aim.y += (head.y - punch.aim.y) * k;
}

/**
 * Where the head is against where the punch is going, as it lands. A
 * straight punch goes to a point, so the head moving any way takes it
 * out. A hook sweeps across, so moving sideways barely helps and only
 * ducking under it does. The body stays where it is, so a body shot
 * always gets there, and only the elbows stop it.
 */
export function contactOf(punch: ActivePunch, head: HeadSpot): Contact {
  if (punch.level === "body") return { amount: 1, dodge: null };
  const dx = (head.x - punch.aim.x) * (punch.style === "hook" ? RULES.hookSweep : 1);
  const dy = head.y - punch.aim.y;
  const off = Math.hypot(dx, dy);
  const amount = off <= RULES.cleanRadius ? 1 : Math.max(0, 1 - (off - RULES.cleanRadius) / (RULES.missRadius - RULES.cleanRadius));
  if (amount >= GRAZE) return { amount, dodge: null };
  // Named by the way the head went: down under it, or off to the side.
  return { amount: 0, dodge: Math.abs(dy) >= Math.abs(dx) && dy < 0 ? "duck" : "slip" };
}
