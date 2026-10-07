import type { Match } from "./match";
import { canShootOutOf } from "./moves";
import { JUMPER, releaseJumper } from "./shooting";
import type { Action, Athlete } from "./types";

type Move = Extract<Action, { kind: "move" }>;

/**
 * Shoot pressed in the middle of a dribble move is not lost: it waits
 * until the move can be shot out of, then the jumper comes straight off
 * it. The move already loaded the legs, so the jumper starts partway
 * through its dip by as long as Shoot has been held, which also keeps
 * the meter in step with the hold the phone measures.
 */
export function queueShot(m: Match, act: Move): void {
  if (!act.queued) act.queued = { at: m.time, released: false, heldMs: undefined };
}

/** Shoot let go while the shot still waits on the move: it goes up and out in one motion. */
export function releaseQueued(act: Move, heldMs: number | undefined): void {
  if (!act.queued) return;
  act.queued.released = true;
  act.queued.heldMs = heldMs;
}

/** Runs the waiting shot once the move allows it. `press` is Shoot pressed fresh. */
export function flowShot(m: Match, a: Athlete, act: Move, press: (m: Match, a: Athlete) => void): void {
  const q = act.queued;
  if (!q || a.action !== act || !canShootOutOf(act)) return;
  a.action = { kind: "none" };
  press(m, a);
  // Read back fresh: the press has just replaced the action.
  const now: Action = a.action as Action;
  if (now.kind !== "shoot" || now.float) return;
  // A stepback hop plays from its start; any other jumper picks up the rhythm of the move.
  if (!now.step) now.t = Math.min(m.time - q.at, JUMPER.takeoff * 0.9);
  if (q.released) releaseJumper(m, a, q.heldMs);
}
