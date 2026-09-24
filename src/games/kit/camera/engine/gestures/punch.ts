import type { Body, Hand } from "../body";
import { ramp } from "../geometry";
import { LM } from "../landmarks";

export interface PunchOptions {
  /** How straight the arm must get, 0 to 1, from 3D straightness or picture reach, whichever is more. */
  straight: number;
  /** How much straighter it must get within the window. */
  rise: number;
  windowMs: number;
  /** The wrist must also come this far toward the camera within the window, in metres. */
  forward: number;
  /** After a punch the arm must bend back under this straightness before it can punch again. */
  rearm: number;
  cooldownMs: number;
  /** The wrist must be within this height of its shoulder, in torso lengths. Hands dropping or raised overhead never count. */
  band: number;
  /** A hook: the wrist swinging in toward the middle this fast, in torso lengths per second... */
  hookSpeed: number;
  /** ...with the elbow up, no more than this far under the shoulder, in torso lengths. */
  hookElbow: number;
}

export const DEFAULT_PUNCH: PunchOptions = {
  straight: 0.82,
  rise: 0.2,
  windowMs: 260,
  forward: 0.12,
  rearm: 0.68,
  cooldownMs: 250,
  band: 0.75,
  hookSpeed: 2.4,
  hookElbow: 0.35,
};

export interface Punch {
  hand: Hand;
  /** Straight at the camera or out to the side, or a hook swung in across the face. */
  style: "straight" | "hook";
  /** How fast it was, 0 to 1. */
  power: number;
  confidence: number;
}

interface Sample {
  time: number;
  straight: number;
  forward: number;
}

/**
 * Punches for one hand. A straight punch is the arm getting straight fast
 * while the wrist drives toward the camera: the world points give the
 * depth, and the picture gives the reach when the punch goes off to one
 * side. A hook is the fist swinging in fast with the elbow up. Then the
 * arm has to come back before it can throw again, so one punch never
 * counts twice.
 */
export class PunchDetector {
  private history: Sample[] = [];
  private armed = true;
  private lastPunch = -Infinity;

  constructor(
    readonly hand: Hand,
    private options: PunchOptions = DEFAULT_PUNCH,
  ) {}

  configure(options: PunchOptions): void {
    this.options = options;
  }

  reset(): void {
    this.history = [];
    this.armed = true;
    this.lastPunch = -Infinity;
  }

  /** `armLength` is the player's arm in torso lengths, from calibration. Returns a punch on the frame it lands. */
  update(body: Body, armLength: number): Punch | null {
    const o = this.options;
    const arm = body.arms[this.hand];
    const straight = Math.max(arm.extension, arm.reach / armLength);
    const sample = { time: body.time, straight, forward: arm.forward };
    this.history = this.history.filter((s) => body.time - s.time <= o.windowMs);
    this.history.push(sample);
    const inward = this.hand === "left" ? body.velocity.left.x : -body.velocity.right.x;
    if (!this.armed && straight < o.rearm && Math.abs(inward) < o.hookSpeed / 2) this.armed = true;
    if (!this.armed || body.time - this.lastPunch < o.cooldownMs) return null;
    if (Math.abs(arm.offset.y) > o.band || !arm.visible) return null;

    const low = this.history.reduce((a, s) => (s.straight < a.straight ? s : a), sample);
    const drove = arm.forward - Math.min(...this.history.map((s) => s.forward)) >= o.forward;
    if (straight >= o.straight && straight - low.straight >= o.rise && drove) {
      const seconds = Math.max(0.03, (body.time - low.time) / 1000);
      return this.land("straight", ramp((straight - low.straight) / seconds, 1, 5), ramp(straight, o.straight - 0.1, o.straight + 0.1));
    }
    if (inward >= o.hookSpeed && this.elbowUp(body)) {
      return this.land("hook", ramp(inward, o.hookSpeed, o.hookSpeed * 2.5), ramp(inward, o.hookSpeed * 0.8, o.hookSpeed * 1.3));
    }
    return null;
  }

  private land(style: Punch["style"], power: number, confidence: number): Punch {
    this.armed = false;
    this.lastPunch = this.history[this.history.length - 1]!.time;
    return { hand: this.hand, style, power, confidence };
  }

  private elbowUp(body: Body): boolean {
    const [s, e] = this.hand === "left" ? [LM.leftShoulder, LM.leftElbow] : [LM.rightShoulder, LM.rightElbow];
    return body.landmarks[e]!.y - body.landmarks[s]!.y <= this.options.hookElbow * body.scale;
  }
}
