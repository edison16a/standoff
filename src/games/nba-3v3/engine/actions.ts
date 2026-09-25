import { RIM_SPOT, rimDistance } from "./court";
import { updateBlock, updateSteal } from "./defend";
import { startDrive, updateDrive } from "./drive";
import type { Match } from "./match";
import { canShootOutOf, updateMove } from "./moves";
import { choosePassTarget, throwPass } from "./passing";
import { JUMPER, releaseJumper, startJumper } from "./shooting";
import { BOARD, JUMP, SHOT } from "./tuning";
import type { Athlete } from "./types";
import { dir2, type V2 } from "./vec";

export { pressDefend } from "./defend";

/**
 * Shoot pressed. Driving at the rim close in makes it a layup or a dunk;
 * anywhere else it starts a jump shot and the meter.
 */
export function pressShoot(m: Match, a: Athlete): void {
  if (m.ball.holder !== a.id) return;
  // Late in a dribble move the shot comes straight out of it, as off a stepback.
  if (a.action.kind === "move" && canShootOutOf(a.action)) a.action = { kind: "none" };
  if (a.action.kind !== "none" && a.action.kind !== "pass") return;
  if (m.needsClear) {
    m.emit({ type: "mustClear", id: a.id });
    return;
  }
  const d = rimDistance(a);
  const speed = Math.hypot(a.vx, a.vz);
  const toRim = dir2(a, RIM_SPOT);
  const heading = speed > 0.1 ? (a.vx * toRim.x + a.vz * toRim.z) / speed : 0;
  const driving = d < SHOT.driveRange && speed > 1.6 && heading > 0.55;
  // Under the glass there is no jumper to take, so it becomes a reverse layup.
  const underGlass = a.z < BOARD.face + 0.3 && Math.abs(a.x - RIM_SPOT.x) < 2.8;
  if (driving || underGlass || d < SHOT.closeRange) startDrive(m, a);
  else startJumper(m, a);
}

export function releaseShot(m: Match, a: Athlete, heldMs?: number): void {
  if (a.action.kind === "shoot") releaseJumper(m, a, heldMs);
}

/** Pass with the ball, or ask for it when a teammate has it. */
export function pressPass(m: Match, a: Athlete, aim: V2 | null): void {
  const holder = m.holder;
  if (holder === a) {
    if (a.action.kind !== "none") return;
    const target = choosePassTarget(m, a, aim);
    if (target) throwPass(m, a, target);
    return;
  }
  if (holder && holder.team === a.team && m.time - a.calledAt > 0.8) {
    a.calledAt = m.time;
    m.emit({ type: "call", id: a.id });
  }
}

/** Moves every action on by one step. */
export function updateAction(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  switch (act.kind) {
    case "none":
      return;
    case "shoot": {
      const before = act.t;
      act.t += dt;
      const s = (act.t - JUMPER.takeoff) / JUMPER.air;
      // A free throw is a set shot: the knees dip and the feet stay down.
      a.y = !act.free && s > 0 && s < 1 ? JUMPER.peak * 4 * s * (1 - s) : 0;
      if (!act.released && act.t * 1000 >= SHOT.meterMs * SHOT.autoReleaseAt) releaseJumper(m, a);
      const landAt = JUMPER.takeoff + JUMPER.air;
      if (!act.free && before < landAt && act.t >= landAt) {
        a.recover = JUMP.shotRecover;
        m.emit({ type: "land", id: a.id, hard: false });
      }
      if (act.released && act.t >= landAt + 0.1) a.action = { kind: "none" };
      return;
    }
    case "drive":
      return updateDrive(m, a, dt);
    case "block":
      return updateBlock(m, a, dt);
    case "steal":
      return updateSteal(m, a, dt);
    case "move":
      return updateMove(m, a, dt);
    case "pass":
      act.t += dt;
      if (act.t > 0.3) a.action = { kind: "none" };
      return;
    case "stumble":
    case "celebrate":
      act.t += dt;
      if (act.t > act.dur) a.action = { kind: "none" };
      return;
  }
}

