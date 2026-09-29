import { brake } from "./athlete";
import { JUMP } from "./defence-tuning";
import type { Athlete, MatchState } from "./types";

/** Off the ground to block: a guarding defender at a shot, or the wall as a free kick is struck. */
export function startJump(state: MatchState, a: Athlete): void {
  a.action = "jump";
  a.actionT = 0;
  a.actionLen = JUMP.duration;
  a.defendWait = JUMP.duration + 0.25;
  a.charging = false;
  state.events.push({ type: "jump", athlete: a.id });
}

/** How high the boots are off the turf, t seconds into a jump: up and down again like a thrown ball. */
export function jumpLift(t: number): number {
  const u = t / JUMP.duration;
  if (u <= 0 || u >= 1) return 0;
  return 4 * JUMP.height * u * (1 - u);
}

/** In the air the body keeps a little of its run and cannot steer. */
export function updateJump(a: Athlete, dt: number): void {
  brake(a, dt, 3);
}
