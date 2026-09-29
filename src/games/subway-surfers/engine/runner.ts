import { newRunner, bodyHeight, type RunnerState } from "./body";
import { collide, groundUnder, sideBlocker, type Contact } from "./contact";
import { gravity, launchSpeed, sideStep } from "./motion";
import { JUMP, LANE_WIDTH, laneX, ROLL, type Lane } from "./tuning";
import type { Obstacle } from "./types";

export { bodyHeight, groundUnder, newRunner, type Contact, type RunnerState };

/** What the player is asking for this step. `jump` and `duck` are true on the step the move is seen. */
export interface RunnerInput {
  lane: Lane;
  jump: boolean;
  duck: boolean;
  /** Still down, which keeps a roll going. */
  ducking: boolean;
}

export interface Abilities {
  /** Metres a second along the track. */
  speed: number;
  jumpHeight: number;
  /** A jetpack's cruising height, or null on foot. */
  fly: number | null;
}

export interface StepResult {
  jumped: boolean;
  rolled: boolean;
  /** The speed the runner fell at, on the step they land. */
  landed: number | null;
  laneFrom: Lane | null;
  contact: Contact | null;
}

/**
 * Moves one runner on by `dt` seconds: jumps, rolls, lane changes, the
 * ground under them, and anything they run into. It changes the state in
 * place and reports what happened. Scoring and power ups live in Run.
 */
export function stepRunner(s: RunnerState, input: RunnerInput, near: readonly Obstacle[], ability: Abilities, dt: number): StepResult {
  const out: StepResult = { jumped: false, rolled: false, landed: null, laneFrom: null, contact: null };
  const flying = ability.fly !== null;
  upAndDown(s, input, ability, flying, out);
  s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);
  across(s, input, near, flying, out, dt);

  const before = s.distance;
  const feetBefore = s.y;
  s.distance += ability.speed * dt;

  if (flying) {
    s.y += (ability.fly! - s.y) * (1 - Math.exp(-2.5 * dt));
    s.vy = 0;
    s.grounded = false;
    s.slamming = false;
  } else fall(s, near, feetBefore, out, dt);
  s.airTime = s.grounded ? 0 : s.airTime + dt;
  s.coyote = s.grounded ? 0 : s.coyote + dt;

  if (s.ghost <= 0 && !flying) out.contact = collide(s, near, before, feetBefore) ?? out.contact;
  s.ghost = Math.max(0, s.ghost - dt);
  if (s.rollLeft > 0) {
    s.rollLeft = Math.max(0, s.rollLeft - dt);
    s.rollAge += dt;
  }
  return out;
}

/** Jumps and rolls: a duck in the air drops fast, and a jump waits a moment for the ground. */
function upAndDown(s: RunnerState, input: RunnerInput, ability: Abilities, flying: boolean, out: StepResult): void {
  if (input.jump) s.jumpBuffer = JUMP.bufferS;
  if (input.duck && !flying) {
    if (!s.grounded) {
      s.slamming = true;
      s.vy = Math.min(s.vy, -JUMP.slam);
      s.jumpBuffer = 0;
    } else if (s.rollLeft <= 0) startRoll(s, out);
  }
  // Staying down keeps the roll going, up to a limit.
  if (s.rollLeft > 0 && input.ducking && s.rollAge < ROLL.maxS) s.rollLeft = Math.max(s.rollLeft, 0.12);
  // Just off the end of a roof, the foot still counts as on it for a moment.
  const footing = s.grounded || (s.coyote > 0 && s.coyote < JUMP.coyoteS && !s.slamming);
  if (s.jumpBuffer > 0 && footing && !flying) {
    s.vy = launchSpeed(ability.jumpHeight);
    s.grounded = false;
    s.coyote = JUMP.coyoteS;
    s.rollLeft = 0;
    s.jumpBuffer = 0;
    out.jumped = true;
  }
}

/**
 * Sideways, one lane at a time, only if the lane beside is clear. A second
 * lane waits until the body is most of the way into the first.
 */
function across(s: RunnerState, input: RunnerInput, near: readonly Obstacle[], flying: boolean, out: StepResult, dt: number): void {
  const settled = Math.abs(s.x - laneX(s.lane)) < LANE_WIDTH * 0.35;
  if (input.lane !== s.lane && settled) {
    const target = (s.lane + Math.sign(input.lane - s.lane)) as Lane;
    const blocker = s.ghost > 0 || flying ? null : sideBlocker(s, target, near);
    if (blocker) {
      if (s.blockedBy !== blocker.id) out.contact = { type: "side", obstacle: blocker, side: target > s.lane ? 1 : -1 };
      s.blockedBy = blocker.id;
    } else {
      out.laneFrom = s.lane;
      s.lane = target;
      s.blockedBy = null;
    }
  } else if (input.lane === s.lane) s.blockedBy = null;
  s.x += sideStep(laneX(s.lane) - s.x, dt);
}

/** Gravity, and the ground or roof under the feet. */
function fall(s: RunnerState, near: readonly Obstacle[], feetBefore: number, out: StepResult, dt: number): void {
  s.vy -= gravity(s.vy) * dt;
  s.y += s.vy * dt;
  const ground = groundUnder(s.x, Math.max(s.y, feetBefore), s.distance, near);
  if (s.y <= ground) {
    if (!s.grounded) {
      out.landed = -s.vy;
      if (s.slamming) startRoll(s, out);
    }
    s.y = ground;
    s.vy = 0;
    s.grounded = true;
    s.slamming = false;
  } else if (s.grounded && s.y - ground > 0.02) s.grounded = false;
}

function startRoll(s: RunnerState, out: StepResult): void {
  s.rollLeft = ROLL.minS;
  s.rollAge = 0;
  out.rolled = true;
}
