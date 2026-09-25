import { CHARACTERS, type CharacterId } from "../roster";
import { advanceMove } from "./attack";
import { bufferPress, freeControl, leaveGround, shieldControl, tryAttack } from "./control";
import { moveOf } from "./moves";
import { moveBody, steer, type Contact } from "./physics";
import { stepRespawn } from "./stocks";
import { stepShield } from "./shield";
import { LAUNCH, MOVEMENT, SHIELD } from "./tuning";
import { chargeOverTime } from "./ult";
import type { Command, Fighter, MatchState } from "./types";

/** A fresh fighter standing at their start spot. */
export function makeFighter(id: number, slot: number, character: CharacterId, seat: number | null, x: number, stocks: number): Fighter {
  return {
    id,
    slot,
    character,
    seat,
    pos: { x, y: 0 },
    vel: { x: 0, y: 0 },
    launch: { x: 0, y: 0 },
    facing: x > 0 ? -1 : 1,
    action: "idle",
    frame: 0,
    move: null,
    swing: 0,
    struck: [],
    ground: 0,
    airJumps: 1,
    recoveryUsed: false,
    dropping: 0,
    freeze: 0,
    hitstun: 0,
    lag: 0,
    invincible: 0,
    percent: 0,
    stocks,
    ult: 0,
    shield: 1,
    downHeld: 0,
    lastY: 0,
    buffer: null,
    jumpBuffer: 0,
    lastHitBy: null,
    platform: null,
    place: null,
    stats: { kos: 0, falls: 0, damageDealt: 0, damageTaken: 0, hits: 0, ults: 0 },
    brain: null,
  };
}

/** Whether the fighter is on the stage and can be hit, as opposed to gone or respawning. */
export function inPlay(f: Fighter): boolean {
  return f.action !== "dead" && f.action !== "out" && f.action !== "respawn";
}

/** One fixed step of one fighter: controls, the action's own timeline, then the body. */
export function stepFighter(state: MatchState, f: Fighter, cmd: Command, dt: number): void {
  if (f.action === "out") return;
  if (f.action === "dead" || f.action === "respawn") return stepRespawn(state, f, cmd);
  // Hit stop freezes everything about the fighter, presses included, except the buffer.
  if (f.freeze > 0) {
    f.freeze--;
    bufferPress(f, cmd);
    return;
  }
  // Moves count their own frames as they play.
  if (f.action !== "attack") f.frame++;
  if (f.invincible > 0) f.invincible--;
  if (f.dropping > 0) f.dropping--;
  chargeOverTime(state, f, dt);
  bufferPress(f, cmd);
  act(state, f, cmd);
  steer(f, cmd, dt);
  settle(state, f, moveBody(f, state.stage, dt));
  stepShield(f, dt);
  f.lastY = cmd.y;
}

function act(state: MatchState, f: Fighter, cmd: Command): void {
  switch (f.action) {
    case "idle":
    case "run":
    case "air":
      freeControl(state, f, cmd);
      break;
    case "shield":
      if (f.lag > 0) f.lag--;
      shieldControl(state, f, cmd);
      break;
    case "jumpsquat":
      // Attack during the crouch cancels the jump: that is how up attacks come out.
      if (tryAttack(state, f)) break;
      if (f.frame > MOVEMENT.jumpSquat) leaveGround(state, f);
      break;
    case "land":
      if (--f.lag <= 0) toFree(f);
      break;
    case "hurt":
      if (--f.hitstun <= 0) toFree(f);
      break;
    case "dizzy":
      if (f.frame >= SHIELD.breakStun) {
        f.shield = 0.35;
        toFree(f);
      }
      break;
  }
  // A move started this step plays its first frame at once.
  if (f.action === "attack" && !advanceMove(state, f)) toFree(f);
}

/** Back to standing or falling, whichever fits. */
function toFree(f: Fighter): void {
  f.action = f.ground !== null ? "idle" : "air";
  f.frame = 0;
  f.move = null;
}

/** Landing, bouncing and walking off edges, after the body moved. */
function settle(state: MatchState, f: Fighter, contact: Contact): void {
  if (contact.leftGround && (f.action === "idle" || f.action === "run" || f.action === "shield")) {
    f.action = "air";
    f.frame = 0;
  }
  if (contact.landed === null) return;
  const launchSpeed = Math.hypot(f.launch.x, f.launch.y);
  if (f.action === "hurt" && launchSpeed >= LAUNCH.bounceSpeed) {
    // Slammed into the floor hard: bounce off it instead of landing.
    f.launch.y = Math.abs(f.launch.y) * LAUNCH.bounce;
    f.vel.y = Math.abs(f.vel.y) * LAUNCH.bounce;
    return;
  }
  f.ground = contact.landed;
  f.vel.y = 0;
  f.launch = { x: f.launch.x * 0.5, y: 0 };
  f.airJumps = 1;
  f.recoveryUsed = false;
  state.events.push({ type: "land", id: f.id });
  if (f.action === "attack" && f.move) {
    const move = moveOf(f.character, f.move);
    // Ground moves and cast in place moves carry on; an aerial ends in its landing lag.
    if (move.landLag === undefined) return;
    f.lag = move.landLag;
  } else if (f.action === "hurt") f.lag = Math.min(f.hitstun, 16);
  else if (f.action === "air") f.lag = MOVEMENT.landLag;
  else return;
  f.action = "land";
  f.frame = 0;
  f.move = null;
  f.hitstun = 0;
}

/** The fighter's body box, feet at the bottom middle. */
export function hurtbox(f: Fighter): { x1: number; x2: number; y1: number; y2: number } {
  const p = CHARACTERS[f.character].physique;
  return { x1: f.pos.x - p.width / 2, x2: f.pos.x + p.width / 2, y1: f.pos.y, y2: f.pos.y + p.height };
}
