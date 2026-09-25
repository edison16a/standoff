import type { Action } from "../../engine/types";
import { blend, over, restPose, type Pose, type PosePatch } from "./pose";
import type { Style } from "./style";

/** What the body is doing, read off the fighter by the view. */
export interface MotionInput {
  action: Action;
  /** Frames into the action, with the fraction since the last step. */
  frame: number;
  /** Running speed and vertical speed, metres per second. */
  speed: number;
  rise: number;
  /** 0 to 1 through a running stride. */
  stride: number;
  time: number;
  /** True for the first moments after a double jump. */
  doubleJump: boolean;
  /** How fast a hit is carrying them, for tumbling. */
  launch: number;
  winner: boolean;
}

const CROUCH: PosePatch = { hipY: -0.2, torsoX: 0.25, legLLift: 0.7, legRLift: 0.7, kneeL: 1.3, kneeR: 1.3, footL: -0.55, footR: -0.55 };
const RECOIL: PosePatch = { torsoX: -0.55, neckX: -0.45, armLRaise: 1.4, armRRaise: 1.1, armLSpread: 0.9, armRSpread: 0.9, elbowL: 0.4, elbowR: 0.4, legLLift: 0.5, kneeL: 0.9, legRLift: -0.3, kneeR: 0.4 };
const SPLAYED: PosePatch = { torsoX: -0.3, armLRaise: 2.2, armRRaise: 2.4, armLSpread: 1.2, armRSpread: 1.2, elbowL: 0.3, elbowR: 0.3, legLSpread: 0.5, legRSpread: 0.5, legLLift: 0.3, kneeL: 0.6, kneeR: 0.3 };
const TUCK: PosePatch = { torsoX: 0.5, neckX: 0.3, legLLift: 1.9, legRLift: 1.9, kneeL: 2.3, kneeR: 2.3, armLRaise: 1.2, armRRaise: 1.2, elbowL: 1.6, elbowR: 1.6 };
const RISE: PosePatch = { legLLift: 1.1, kneeL: 1.7, legRLift: -0.2, kneeR: 0.5, footR: 0.4, torsoX: 0.1 };
const FALL: PosePatch = { legLLift: 0.4, kneeL: 0.5, legRLift: 0.1, kneeR: 0.3, armLRaise: 0.9, armRRaise: 0.7, armLSpread: 0.6, armRSpread: 0.6 };

const REST = restPose();

/**
 * Every pose that is not an attack: the guard, the run, jumps and the
 * double jump somersault, landings, being hit and tumbling, the shield,
 * a dizzy wobble and the winner's celebration.
 */
export function motionPose(style: Style, m: MotionInput, out: Pose): Pose {
  const breathe = Math.sin(m.time * 3.2);
  over(over(out, REST), style.stance);
  out.hipY += breathe * 0.012;
  out.torsoX += breathe * 0.02;
  switch (m.action) {
    case "run":
      return run(style, m, out);
    case "jumpsquat":
    case "land":
      return blend(out, CROUCH, m.action === "land" ? Math.max(0.4, 1 - m.frame / 10) : 1, out);
    case "air":
    case "attack":
      return air(m, out);
    case "hurt":
      if (m.launch > 9) {
        blend(out, SPLAYED, 1, out);
        out.flip = -m.frame * Math.min(0.5, m.launch * 0.018);
        return out;
      }
      return blend(out, RECOIL, Math.min(1, m.frame / 3 + 0.5), out);
    case "shield":
      return over(blend(out, CROUCH, 0.45, out), style.guard);
    case "dizzy": {
      const sway = Math.sin(m.time * 4);
      return over(out, { torsoZ: sway * 0.25, neckX: 0.5, neckY: sway * 0.4, armLRaise: 0.1, armRRaise: 0.1, elbowL: 0.1, elbowR: 0.1, kneeL: 0.35, kneeR: 0.35, hipY: -0.05 });
    }
    default:
      if (m.winner) return win(style, m, out);
      return out;
  }
}

function run(style: Style, m: MotionInput, out: Pose): Pose {
  const a = m.stride * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const k = Math.min(1, m.speed / 4);
  over(out, style.runArms);
  out.torsoX += style.runLean * k;
  out.hipY = -Math.abs(Math.sin(a)) * 0.06 * k - 0.03;
  out.legLLift = s * 0.85 * k + 0.1;
  out.legRLift = -s * 0.85 * k + 0.1;
  out.kneeL = (Math.max(0, -c) * 1.4 + 0.2) * k;
  out.kneeR = (Math.max(0, c) * 1.4 + 0.2) * k;
  out.armLRaise += -s * 0.7 * k * style.armSwing;
  out.armRRaise += s * 0.7 * k * style.armSwing;
  out.torsoY = s * 0.15 * k;
  return out;
}

function air(m: MotionInput, out: Pose): Pose {
  if (m.doubleJump) {
    const u = Math.min(1, m.frame / 24);
    blend(out, TUCK, Math.sin(u * Math.PI), out);
    out.flip = (1 - (1 - u) * (1 - u)) * Math.PI * 2;
    return out;
  }
  const k = Math.max(0, Math.min(1, (m.rise + 4) / 10));
  blend(out, FALL, 1, out);
  return blend(out, RISE, k, out);
}

function win(style: Style, m: MotionInput, out: Pose): Pose {
  const bounce = Math.abs(Math.sin(m.time * 4.5));
  over(out, style.win);
  out.hipY += bounce * 0.12;
  out.armLRaise += bounce * 0.25;
  out.armRRaise += bounce * 0.25;
  return out;
}
