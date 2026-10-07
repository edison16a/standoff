import { startCheer } from "./celebrate";
import { RIM_SPOT, rimDistance } from "./court";
import { pressJump, updateBlock, updateSteal } from "./defend";
import { startDrive, updateDrive } from "./drive";
import type { Match } from "./match";
import { canShootOutOf, updateMove } from "./moves";
import { flowShot, queueShot, releaseQueued } from "./move-flow";
import { choosePassTarget, throwPass } from "./passing";
import { floaterFits, startFloater, updateFloater } from "./floater";
import { JUMPER, releaseJumper, startJumper } from "./shooting";
import { hopHeight, plantStepback, STEPBACK } from "./stepback";
import { BOARD, FREE_THROW, JUMP, SHOT } from "./tuning";
import type { Athlete } from "./types";
import { dir2, type V2 } from "./vec";

export { pressDefend } from "./defend";

/**
 * Shoot pressed. Driving at the rim close in makes it a layup or a dunk;
 * anywhere else it starts a jump shot and the meter.
 */
export function pressShoot(m: Match, a: Athlete): void {
  if (m.ball.holder !== a.id) return;
  const outOf = a.action.kind === "move" ? a.action.move : null;
  // Late in a dribble move the shot comes straight out of it, as off a stepback; earlier it waits for that moment.
  if (a.action.kind === "move" && canShootOutOf(a.action)) a.action = { kind: "none" };
  else if (a.action.kind === "move") return queueShot(m, a.action);
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
  // Running hard at the rim from the edge of the paint, or with a big man waiting, it goes up early and soft.
  if (!underGlass && floaterFits(m, a, d, speed, heading)) startFloater(m, a);
  else if (driving || underGlass || d < SHOT.closeRange) startDrive(m, a);
  else startJumper(m, a, false, outOf);
}

export function releaseShot(m: Match, a: Athlete, heldMs?: number): void {
  if (a.action.kind === "shoot") releaseJumper(m, a, heldMs);
  else if (a.action.kind === "move") releaseQueued(a.action, heldMs);
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
  // On defence Pass is Block, even while the attackers' pass is in the air.
  if (m.defending(a)) return pressJump(m, a);
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
      // A gesture owed for a big basket starts once the shooter has landed.
      if (a.cheer) startCheer(a, false);
      return;
    case "shoot": {
      if (act.float) return updateFloater(m, a, act, dt);
      const before = act.t;
      act.t += dt;
      const s = (act.t - JUMPER.takeoff) / JUMPER.air;
      // A free throw is a set shot: the knees dip and the feet stay down. A stepback hops back first.
      a.y = !act.free && s > 0 && s < 1 ? JUMPER.peak * 4 * s * (1 - s) : act.step ? hopHeight(act.t) : 0;
      if (act.step && before < STEPBACK.air && act.t >= STEPBACK.air) plantStepback(a);
      // A jumper in the air must come out; a free throw is a set shot and waits as long as Shoot is held.
      const limitMs = act.free ? FREE_THROW.maxHoldMs : SHOT.meterMs * SHOT.autoReleaseAt;
      if (!act.released && act.t * 1000 >= limitMs) releaseJumper(m, a);
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
      updateMove(m, a, dt);
      return flowShot(m, a, act, pressShoot);
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

