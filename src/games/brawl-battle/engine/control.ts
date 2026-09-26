import { CHARACTERS } from "../roster";
import { canStart, startMove } from "./attack";
import { startHold, trackHold, tryCharge } from "./charge";
import { cancelKey, connected, recoveryDone, wantsOut, weightOf } from "./flow";
import { moveOf } from "./moves";
import { onPassThrough } from "./physics";
import { selectMove } from "./select";
import { BUFFER_FRAMES, MOVEMENT, SHIELD } from "./tuning";
import type { Command, Fighter, MatchState } from "./types";

/**
 * What a fighter's controls do when they are free to act: attacks from
 * the buffer, jumps, dropping through platforms and the shield.
 */

/**
 * Keeps the latest press, and a jump, for a few frames, so an early press
 * still comes out. In hit stop (`ticking` false) presses are kept whole,
 * so a follow up pressed on the impact is never lost to the freeze.
 */
export function bufferPress(f: Fighter, cmd: Command, ticking = true): void {
  const button = cmd.ult ? "ult" : cmd.heavy ? "heavy" : cmd.light ? "light" : null;
  // A press still held is timed instead, to tell a tap from a charge.
  const holding = button !== null && button !== "ult" && startHold(f, cmd, button);
  if (button && !holding) f.buffer = { button, x: cmd.x, y: cmd.y, frames: BUFFER_FRAMES };
  else if (!button && ticking && f.buffer && --f.buffer.frames <= 0) f.buffer = null;
  if (!holding) trackHold(f, cmd);
  if (cmd.jump) f.jumpBuffer = BUFFER_FRAMES;
  else if (ticking && f.jumpBuffer > 0) f.jumpBuffer--;
}

/** A jump pressed this step or a moment ago, used up as it is read. */
function takeJump(f: Fighter, cmd: Command): boolean {
  const jump = !!cmd.jump || f.jumpBuffer > 0;
  f.jumpBuffer = 0;
  return jump;
}

/** Starts the buffered attack if the fighter can. */
export function tryAttack(state: MatchState, f: Fighter): boolean {
  if (!f.buffer) return false;
  const { button, x, y } = f.buffer;
  const key = selectMove(button, x, y, f.ground !== null);
  if (!canStart(f, key)) {
    // An ult that is not ready, or a spent recovery, is simply dropped.
    f.buffer = null;
    return false;
  }
  startMove(state, f, key, x);
  return true;
}

export function airJump(state: MatchState, f: Fighter, cmd: Command): boolean {
  if (f.airJumps <= 0) return false;
  const p = CHARACTERS[f.character].physique;
  f.airJumps--;
  f.vel.y = p.doubleJump;
  // A double jump lets the fighter change direction, as in the games this is after.
  f.vel.x = Math.abs(cmd.x) >= MOVEMENT.deadZone ? cmd.x * p.air : f.vel.x * 0.5;
  f.action = "air";
  f.frame = 0;
  state.events.push({ type: "jump", id: f.id, double: true });
  return true;
}

export function leaveGround(state: MatchState, f: Fighter): void {
  const p = CHARACTERS[f.character].physique;
  f.vel.y = p.jump;
  f.ground = null;
  f.action = "air";
  f.frame = 0;
  state.events.push({ type: "jump", id: f.id, double: false });
}

/** Idle, running or in the air: read the controls. */
export function freeControl(state: MatchState, f: Fighter, cmd: Command): void {
  const grounded = f.ground !== null;
  // An attack pressed with the jump wins, so up and Attack together is an up attack.
  if (tryCharge(state, f) || tryAttack(state, f)) return;
  if (takeJump(f, cmd)) {
    if (grounded) {
      f.action = "jumpsquat";
      f.frame = 0;
    } else airJump(state, f, cmd);
    return;
  }
  if (!grounded) return;
  const flickedDown = cmd.y <= -MOVEMENT.flick && f.lastY > -MOVEMENT.flick;
  if (flickedDown && onPassThrough(f, state.stage)) {
    f.ground = null;
    f.dropping = MOVEMENT.dropThrough;
    f.action = "air";
    f.frame = 0;
    return;
  }
  f.downHeld = cmd.y <= -MOVEMENT.flick ? f.downHeld + 1 : 0;
  if (f.downHeld >= SHIELD.delay && !onPassThrough(f, state.stage) && f.shield > 0) {
    f.action = "shield";
    f.frame = 0;
    return;
  }
  const running = Math.abs(cmd.x) >= MOVEMENT.deadZone;
  if (running) f.facing = cmd.x > 0 ? 1 : -1;
  const next = running ? "run" : "idle";
  if (f.action !== next) {
    f.action = next;
    f.frame = 0;
  }
}

/**
 * Swinging. A landed move cancels into the buffered next one, or into a
 * jump after a light hit. Once enough of the recovery has played, any
 * input ends the move: a press starts the next one, and a lean or a jump
 * frees the fighter on this same step. Left alone, the move plays out.
 */
export function attackControl(state: MatchState, f: Fighter, cmd: Command): void {
  const next = cancelKey(f);
  if (next && canStart(f, next)) {
    startMove(state, f, next, f.buffer!.x);
    return;
  }
  const light = f.move !== null && weightOf(f.move, moveOf(f.character, f.move)) === "light";
  if (connected(f) && light && f.jumpBuffer > 0) return jumpOut(state, f, cmd);
  if (!recoveryDone(f) || !wantsOut(f, cmd)) return;
  if (tryCharge(state, f) || tryAttack(state, f)) return;
  f.action = f.ground !== null ? "idle" : "air";
  f.frame = 0;
  f.move = null;
  freeControl(state, f, cmd);
}

/** Leaves a move with a jump: the crouch on the floor, the double jump in the air. */
function jumpOut(state: MatchState, f: Fighter, cmd: Command): void {
  f.jumpBuffer = 0;
  f.move = null;
  if (f.ground !== null) {
    f.action = "jumpsquat";
    f.frame = 0;
  } else if (!airJump(state, f, cmd)) f.action = "air";
}

/** Holding the shield: let go to drop it, or attack or jump straight out of it. */
export function shieldControl(state: MatchState, f: Fighter, cmd: Command): void {
  if (f.lag > 0) return;
  if (f.ground === null || cmd.y > -MOVEMENT.deadZone || f.shield <= 0) {
    f.action = "idle";
    f.frame = 0;
    f.downHeld = 0;
    return freeControl(state, f, cmd);
  }
  if (takeJump(f, cmd)) {
    f.action = "jumpsquat";
    f.frame = 0;
    return;
  }
  if (!tryCharge(state, f)) tryAttack(state, f);
}
