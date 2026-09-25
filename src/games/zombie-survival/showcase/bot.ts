import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { Seat } from "@/platform/protocol";
import type { TargetPoint } from "../render/scene-source";

/** What a computer player goes for: the boss's glowing joints, or the dead walking in with it. */
export type BotRole = "boss" | "escort";

/** A shot this far off in clip space still counts as on target. */
const ON_TARGET = 0.035;
/** An escort closer than this, in metres, pulls any bot's aim off the boss. */
const TOO_CLOSE = 7;
/** How quickly a hand swings onto a new target: higher is snappier. */
const SWING = 8;

const onScreen = (t: TargetPoint) => Math.abs(t.x) < 0.92 && Math.abs(t.y) < 0.9;
const key = (t: TargetPoint) => `${t.zombie}:${t.part}:${t.weak ?? ""}`;

/**
 * One computer player in the showcase. It picks something to shoot,
 * swings its aim over like a hand would, with a little tremor, and says
 * when it is on target. Boss players work the weak points, one joint
 * each; escort players drop whatever walks in first.
 */
export class ShowcaseBot {
  aim: ScreenPoint;
  private held: string | null = null;

  constructor(
    readonly seat: Seat,
    private readonly role: BotRole,
    start: ScreenPoint,
  ) {
    this.aim = { ...start };
  }

  /** Moves the aim on by `dt` seconds. Returns whether it sits on a target, ready to fire. */
  track(targets: readonly TargetPoint[], dt: number, time: number): boolean {
    const target = this.choose(targets.filter(onScreen), time);
    if (!target) return false;
    const k = 1 - Math.exp(-dt * SWING);
    // Two slow waves out of step, so each hand drifts on its own and never quite settles.
    const tremor = 0.012;
    const wx = Math.sin(time * 2.3 + this.seat * 1.7) * tremor + Math.sin(time * 5.1 + this.seat) * tremor * 0.4;
    const wy = Math.sin(time * 1.9 + this.seat * 2.9) * tremor + Math.sin(time * 4.3 + this.seat * 3) * tremor * 0.4;
    this.aim = { x: this.aim.x + (target.x + wx - this.aim.x) * k, y: this.aim.y + (target.y + wy - this.aim.y) * k };
    return Math.hypot(this.aim.x - target.x, this.aim.y - target.y) < ON_TARGET;
  }

  private choose(targets: readonly TargetPoint[], time: number): TargetPoint | undefined {
    const escorts = targets.filter((t) => t.part === "head").sort((a, b) => a.distance - b.distance);
    const joints = targets.filter((t) => t.part === "weak").sort((a, b) => (a.weak ?? 0) - (b.weak ?? 0));
    const threat = escorts[0] && escorts[0].distance < TOO_CLOSE ? escorts[0] : undefined;
    const held = targets.find((t) => key(t) === this.held);
    let pick: TargetPoint | undefined;
    if (threat) pick = threat;
    else if (this.role === "boss" && joints.length) {
      // Each boss player works its own joint, moving to the next every few seconds.
      const turn = Math.floor(time / 2.6);
      pick = joints[(this.seat + turn) % joints.length];
    } else pick = held && held.part === "head" ? held : (escorts[this.seat % 2] ?? escorts[0] ?? joints[this.seat % Math.max(1, joints.length)]);
    this.held = pick ? key(pick) : null;
    return pick;
  }
}
