import type { FencerFrame } from "@/game/frames";
import { MAX_SPEED } from "@/game/rules";
import { v2, type Vec2 } from "./geometry";
import type { Pose } from "./skeleton";

/** The en garde stance every character rests in. */
export const GUARD: Pose = {
  hips: v2(0, 0.84),
  lean: 0.1,
  nod: -0.05,
  frontFoot: v2(0.38, 0),
  backFoot: v2(-0.34, 0),
  hand: v2(0.3, -0.2),
  bladeAngle: 0.16,
  bladeYaw: 0,
  wrist: 0,
  backHand: v2(-0.14, 0.26),
};

/** Distance covered by one full advance: front foot, then back foot. */
const STEP_LENGTH = 0.5;
const FOOT_LIFT = 0.07;
/** How far a foot travels relative to the hips during its swing. */
const SWING = STEP_LENGTH / 2;
/** Blade angle limits, so a phone pointed at the ceiling still looks like fencing. */
const BLADE_MIN = -1.2;
const BLADE_MAX = 1.35;

/**
 * Builds the live pose from a frame: the guard stance, feet stepping in
 * time with distance travelled, a slight breathing sway, and the sword arm
 * following the phone. Everything is a pure function of the frame, so
 * the replay draws exactly what live play drew.
 */
export function livePose(frame: FencerFrame, timeMs: number): Pose {
  const walking = Math.min(1, Math.abs(frame.speed) / (MAX_SPEED * 0.25));
  const travel = frame.x * frame.facing;
  const phase = (((travel / STEP_LENGTH) % 1) + 1) % 1;

  // Fencer two breathes a little out of step so they never sway in unison.
  const breathPhase = timeMs / 1000 + (frame.slot === 2 ? 0.37 : 0);
  const breath = Math.sin(breathPhase * 2 * Math.PI * 0.55);

  const frontFoot = stepFoot(GUARD.frontFoot, phase, 0, walking);
  const backFoot = stepFoot(GUARD.backFoot, phase, 0.5, walking);
  const bob = walking * Math.abs(Math.sin(phase * 2 * Math.PI)) * 0.025;

  return {
    ...GUARD,
    hips: v2(GUARD.hips.x, GUARD.hips.y - bob + breath * 0.006),
    lean: GUARD.lean + breath * 0.01,
    frontFoot,
    backFoot,
    hand: v2(GUARD.hand.x + Math.cos(frame.pitch) * 0.03 - 0.03, GUARD.hand.y + Math.sin(frame.pitch) * 0.1),
    bladeAngle: clamp(GUARD.bladeAngle + frame.pitch, BLADE_MIN, BLADE_MAX),
    bladeYaw: frame.yaw,
    wrist: frame.roll,
    backHand: v2(GUARD.backHand.x, GUARD.backHand.y + breath * 0.01),
  };
}

/**
 * One foot's position through a step cycle. For the first half of its
 * cycle the foot swings forward and lifts, for the second half it is
 * planted and slides back relative to the hips as the body moves over it.
 * A retreat plays the same cycle backwards, which is exactly how fencers
 * retreat: back foot first.
 */
function stepFoot(base: Vec2, phase: number, offset: number, weight: number): Vec2 {
  const p = (phase + offset) % 1;
  const swinging = p < 0.5;
  const local = swinging ? p / 0.5 : (p - 0.5) / 0.5;
  const dx = swinging ? -SWING + 2 * SWING * local : SWING - 2 * SWING * local;
  const lift = swinging ? Math.sin(local * Math.PI) * FOOT_LIFT : 0;
  return v2(base.x + dx * weight * 0.5, base.y + lift * weight);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
