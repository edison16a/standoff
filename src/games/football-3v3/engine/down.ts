import type { Athlete, DownCause } from "./types";

/** Puts a player on the ground for `dur` seconds, alone; the last part of it is getting up. */
export function knockDown(a: Athlete, dur: number, cause: DownCause): void {
  a.action = { kind: "down", t: 0, dur, cause, bind: null };
  a.aim = null;
  a.guard = null;
  a.stumble = null;
}

/** Time on the ground runs out and the player is back on their feet. */
export function updateDown(a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "down") return;
  act.t += dt;
  if (act.t >= act.dur) a.action = { kind: "none" };
}
