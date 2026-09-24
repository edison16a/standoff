import { blocksBody, overlapsX, overlapsZ, solidAt, topAt, type Solid } from "./solids";
import { clampLane, JUMP, LANE_WIDTH, laneX, ROLL, RUNNER, type Lane } from "./tuning";
import { frontAt, type Obstacle } from "./types";

/** One runner's body on the tracks. Plain data, so a bot can copy it and try moves ahead of time. */
export interface RunnerState {
  distance: number;
  x: number;
  y: number;
  vy: number;
  /** The lane the runner is in, or moving into. */
  lane: Lane;
  grounded: boolean;
  /** Seconds of roll left, and how long this roll has lasted. */
  rollLeft: number;
  rollAge: number;
  /** A jump asked for in the air, kept for a moment to happen on landing. */
  jumpBuffer: number;
  /** Ducked in the air: falling fast, and rolling on landing. */
  slamming: boolean;
  airTime: number;
  /** Seconds left of passing through things, after a save or a flight. */
  ghost: number;
  /** The obstacle that last stopped a lane change, so leaning on one train bumps only once. */
  blockedBy: number | null;
}

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

export type Contact = { type: "front"; obstacle: Obstacle } | { type: "side"; obstacle: Obstacle; side: -1 | 1 };

export interface StepResult {
  jumped: boolean;
  rolled: boolean;
  /** The speed the runner fell at, on the step they land. */
  landed: number | null;
  laneFrom: Lane | null;
  contact: Contact | null;
}

export function newRunner(distance = 0, lane: Lane = 0): RunnerState {
  return { distance, x: laneX(lane), y: 0, vy: 0, lane, grounded: true, rollLeft: 0, rollAge: 0, jumpBuffer: 0, slamming: false, airTime: 0, ghost: 0, blockedBy: null };
}

export function bodyHeight(s: RunnerState): number {
  return s.rollLeft > 0 ? RUNNER.rollHeight : RUNNER.height;
}

const scratch: Solid = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };

/** The highest thing under the runner's feet that they could stand on, or the ground. */
export function groundUnder(x: number, feet: number, z: number, near: readonly Obstacle[]): number {
  let ground = 0;
  for (const o of near) {
    const solid = solidAt(o, z, scratch);
    if (!overlapsX(solid, x, RUNNER.halfWidth) || !overlapsZ(solid, z, RUNNER.halfDepth)) continue;
    const top = topAt(o, solid, z);
    if (top <= feet + RUNNER.stepUp && top > ground) ground = top;
  }
  return ground;
}

/** The first obstacle in a lane beside the runner that their body would walk into. */
function sideBlocker(s: RunnerState, lane: Lane, near: readonly Obstacle[]): Obstacle | null {
  const x = laneX(lane);
  const head = s.y + bodyHeight(s);
  for (const o of near) {
    if (o.lane !== lane) continue;
    const solid = solidAt(o, s.distance, scratch);
    if (!overlapsX(solid, x, RUNNER.halfWidth) || !overlapsZ(solid, s.distance, RUNNER.halfDepth)) continue;
    if (blocksBody(o, solid, s.distance, s.y, head, RUNNER.stepUp)) return o;
  }
  return null;
}

/**
 * Moves one runner on by `dt` seconds: jumps, rolls, lane changes, the
 * ground under them, and anything they run into. It changes the state in
 * place and reports what happened. Scoring and power ups live in Run.
 */
export function stepRunner(s: RunnerState, input: RunnerInput, near: readonly Obstacle[], ability: Abilities, dt: number): StepResult {
  const out: StepResult = { jumped: false, rolled: false, landed: null, laneFrom: null, contact: null };
  const flying = ability.fly !== null;
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
  if (s.jumpBuffer > 0 && s.grounded && !flying) {
    s.vy = Math.sqrt(2 * JUMP.gravity * ability.jumpHeight);
    s.grounded = false;
    s.rollLeft = 0;
    s.jumpBuffer = 0;
    out.jumped = true;
  }
  s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);

  // Sideways, one lane at a time, only if the lane beside is clear. A second
  // lane waits until the body is most of the way into the first.
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
  const toX = laneX(s.lane) - s.x;
  s.x += Math.sign(toX) * Math.min(Math.abs(toX), RUNNER.sideSpeed * dt);

  const before = s.distance;
  const feetBefore = s.y;
  s.distance += ability.speed * dt;

  if (flying) {
    s.y += (ability.fly! - s.y) * (1 - Math.exp(-2.5 * dt));
    s.vy = 0;
    s.grounded = false;
    s.slamming = false;
  } else {
    s.vy -= JUMP.gravity * dt;
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
  s.airTime = s.grounded ? 0 : s.airTime + dt;

  if (s.ghost <= 0 && !flying) out.contact = collide(s, near, before, feetBefore) ?? out.contact;
  s.ghost = Math.max(0, s.ghost - dt);
  if (s.rollLeft > 0) {
    s.rollLeft = Math.max(0, s.rollLeft - dt);
    s.rollAge += dt;
  }
  return out;
}

function startRoll(s: RunnerState, out: StepResult): void {
  s.rollLeft = ROLL.minS;
  s.rollAge = 0;
  out.rolled = true;
}

/** Whether the runner's body now overlaps something solid, and whether they hit it head on or from the side. */
function collide(s: RunnerState, near: readonly Obstacle[], before: number, feetBefore: number): Contact | null {
  const head = s.y + bodyHeight(s);
  for (const o of near) {
    const solid = solidAt(o, s.distance, scratch);
    if (!overlapsX(solid, s.x, RUNNER.halfWidth) || !overlapsZ(solid, s.distance, RUNNER.halfDepth)) continue;
    if (!blocksBody(o, solid, s.distance, s.y, head, RUNNER.stepUp)) continue;
    // Coming down onto its top is standing on it, not hitting it.
    if (feetBefore >= topAt(o, solid, s.distance) - RUNNER.stepUp) continue;
    const wasAhead = before + RUNNER.halfDepth <= frontAt(o, before) + 0.05;
    if (wasAhead) return { type: "front", obstacle: o };
    // From the side: step back out of its lane.
    const side = (Math.sign(laneX(o.lane) - s.x) || 1) as -1 | 1;
    s.lane = clampLane(o.lane - side);
    s.x = laneX(o.lane) - side * (solid.maxX - solid.minX) * 0.5 - side * (RUNNER.halfWidth + 0.02);
    s.blockedBy = o.id;
    return { type: "side", obstacle: o, side };
  }
  return null;
}
