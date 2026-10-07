import type { BuildSpec } from "../../builds";
import type { Athlete } from "../../engine/types";
import { blockPose, landPose, passPose, shootPose, stealPose } from "./actions";
import type { AthleteScene } from "./base";
import { celebratePose, dejectedPose } from "./celebrations";
import { floaterPose } from "./floater-pose";
import { gesturePose } from "./gestures";
import { finishPose } from "./finish/finish-pose";
import { setShotPose } from "./line";
import { movePose } from "./moves";
import { blend, type Pose } from "./pose";
import { stumblePose } from "./reactions";
import { captainPose, matePose } from "./trophy-poses";

/** After a shot, a dunk or a pass the body eases back into its run this slowly at first. */
const RECOVER = 0.4;

const ease = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};

/** What the view remembers between frames that the actions need. */
export interface ActionMemory {
  time: number;
  /** When the shot left the hand, on the action's clock, or null. */
  releasedAt: number | null;
  /** When the last action ended, and when the feet last came down and how hard. */
  endedAt: number;
  landAt: number;
  hardLand: boolean;
  /** Which way a stumble threw him, from his speed as it began: + to his left. */
  shove: number;
}

/**
 * The pose for whatever the engine says the player is doing, over the
 * base pose underneath, and how fast the body should move into it.
 * Each action plays on the engine's own clock, so the ball and the
 * body agree.
 */
export function actionPose(a: Athlete, c: BuildSpec, s: AthleteScene, base: Pose, m: ActionMemory): { pose: Pose; rate: number } {
  const act = a.action;
  switch (act.kind) {
    case "shoot":
      if (act.released && m.releasedAt === null) m.releasedAt = act.t;
      if (act.float) return { pose: floaterPose(act.t, m.releasedAt, base), rate: 34 };
      return { pose: act.free ? setShotPose(act.t, m.releasedAt, base) : shootPose(act.t, m.releasedAt, base, act.step !== null), rate: 34 };
    case "drive": {
      // The preset's own footwork and shape; a turn in the air is the engine's facing, so no extra spin.
      const pose = finishPose(act, base);
      pose.spin = 0;
      return { pose, rate: 30 };
    }
    case "pass":
      return { pose: passPose(act.t, base), rate: 30 };
    case "block":
      return { pose: blockPose(act.t, act.gather, act.air, base), rate: 30 };
    case "steal":
      return { pose: stealPose(act.t, base), rate: 30 };
    case "move":
      return { pose: movePose(act, base), rate: 26 };
    case "stumble":
      return { pose: stumblePose(act.t, act.dur, base, act.fall, m.shove), rate: act.fall ? 18 : 22 };
    case "celebrate": {
      // Into the celebration and out of it again smoothly, back to the walk to the check.
      if (s.holding) return { pose: base, rate: 16 };
      const show = act.gesture ? gesturePose(act.gesture, act.t) : celebratePose(c.celebration, act.t);
      return { pose: blend(base, show, ease(act.t / 0.25) * ease((act.dur - act.t) / 0.3), { ...base }), rate: 16 };
    }
    case "none": {
      let pose = base;
      const part = s.ceremony;
      if (part) pose = part.role === "captain" ? captainPose(part.t) : part.role === "mate" ? matePose(part.t, part.phase) : dejectedPose(m.time);
      else if (s.winner !== null) pose = s.winner === a.team ? celebratePose(c.celebration, m.time) : dejectedPose(m.time);
      else if (m.time - m.landAt < 0.4) pose = landPose(m.time - m.landAt, m.hardLand, base);
      // Coming out of an action the limbs settle gently instead of snapping back to the run.
      return { pose, rate: 7 + 9 * ease((m.time - m.endedAt) / RECOVER) };
    }
  }
}
