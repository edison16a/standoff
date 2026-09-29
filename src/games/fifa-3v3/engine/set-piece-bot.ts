import { other } from "../teams";
import { chargeLevel } from "./charge";
import { sloppiness } from "./difficulty";
import { goalX } from "./goal";
import { fly } from "./shot-aim";
import { freeKick, SET_KICK, spotBall } from "./set-piece-kick";
import { AIM_RATE, type TakerInput } from "./set-piece-input";
import { PITCH } from "./tuning";
import type { MatchState, SetPiece } from "./types";
import { clamp, norm, sub } from "./vec";

interface Plan {
  aimX: number;
  aimY: number;
  curve: number;
  power: number;
  /** The button went down last step, so it goes up now. */
  down: boolean;
}

const plans = new WeakMap<SetPiece, Plan>();
/** A computer taker lingers on each stage so everyone watching sees the line swing. */
const LINGER = 0.9;

/**
 * A computer player taking a set piece, through the same stages a phone
 * goes through. A free kick is aimed outside the far post and curled
 * back in; a penalty picks a corner. Sloppier levels miss their marks.
 */
export function botSetPiece(state: MatchState, sp: SetPiece, dt: number): TakerInput {
  let plan = plans.get(sp);
  if (!plan) {
    plan = sp.kind === "free" ? planFreeKick(state, sp) : planPenalty(state);
    plans.set(sp, plan);
  }
  const input: TakerInput = { right: 0, up: 0, press: false, release: false };
  if (plan.down) {
    plan.down = false;
    input.release = true;
    return input;
  }
  const press = () => {
    plan.down = true;
    input.press = true;
  };
  switch (sp.stage) {
    case "aim": {
      const rate = sp.kind === "free" ? AIM_RATE.yaw : AIM_RATE.across;
      input.right = clamp((plan.aimX - sp.aimX) / (rate * 0.25), -1, 1);
      if (sp.kind === "penalty") input.up = clamp((plan.aimY - sp.aimY) / (AIM_RATE.up * 0.25), -1, 1);
      if (sp.stageT > LINGER && Math.abs(plan.aimX - sp.aimX) < 0.03 && Math.abs(plan.aimY - sp.aimY) < 0.05) press();
      break;
    }
    case "curve":
      input.right = clamp((plan.curve - sp.curve) / (AIM_RATE.curve * 0.25), -1, 1);
      if (sp.stageT > LINGER * 0.8 && Math.abs(plan.curve - sp.curve) < 0.04) press();
      break;
    case "power":
      if (!sp.charging && sp.stageT > 0.4) {
        input.press = true;
      } else if (sp.charging && chargeLevel(sp.charge + dt) >= plan.power) input.release = true;
      break;
    case "struck":
      break;
  }
  return input;
}

function planFreeKick(state: MatchState, sp: SetPiece): Plan {
  const rng = state.rng;
  const slop = sloppiness(state);
  const far = Math.abs(sp.spot.z) < 0.6 ? rng.sign() : -Math.sign(sp.spot.z);
  const targetZ = far * (PITCH.goalHalfWidth - rng.range(0.45, 0.9));
  // Curl back toward the middle of the goal: the taker's right is +z when attacking toward +x.
  const d = norm(sub({ x: goalX(other(sp.team)), z: 0 }, sp.spot));
  const bendRight = -far * Math.sign(d.x || 1);
  const curve = bendRight * rng.range(0.35, 0.85);
  const aimX = bestYaw(sp, curve, targetZ) + rng.range(-1, 1) * 0.06 * slop;
  const power = clamp(SET_KICK.nominal + rng.range(-0.06, 0.1) + rng.range(-0.1, 0.25) * slop, 0.3, 0.95);
  return { aimX, aimY: 0, curve, power, down: false };
}

/** The turn that sends the kick, with this curve, across the goal line at `targetZ`. */
function bestYaw(sp: SetPiece, curve: number, targetZ: number): number {
  let best = 0;
  let bestErr = Infinity;
  const line = goalX(other(sp.team));
  for (let i = 0; i <= 40; i++) {
    const yaw = -SET_KICK.maxYaw + (i / 40) * SET_KICK.maxYaw * 2;
    const hit = fly(spotBall(sp), freeKick({ ...sp, aimX: yaw, curve }, SET_KICK.nominal), line);
    const err = hit ? Math.abs(hit.z - targetZ) : Infinity;
    if (err < bestErr) {
      bestErr = err;
      best = yaw;
    }
  }
  return best;
}

function planPenalty(state: MatchState): Plan {
  const rng = state.rng;
  const slop = sloppiness(state);
  return {
    aimX: rng.sign() * rng.range(0.9, PITCH.goalHalfWidth - 0.35),
    aimY: rng.range(0.25, 1.8),
    curve: 0,
    power: clamp(rng.range(0.4, 0.75) + rng.range(0, 0.3) * slop, 0.2, 0.98),
    down: false,
  };
}
