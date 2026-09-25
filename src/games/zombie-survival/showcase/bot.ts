import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { Seat } from "@/platform/protocol";
import type { TargetPoint } from "../render/scene-source";
import type { Shooter } from "./targeting";

/** What a computer player leans towards: the boss's glowing joints, or the dead walking in with it. */
export type BotRole = "boss" | "escort";

/** A shot this far off in clip space still counts as on target. */
const ON_TARGET = 0.035;
/** How quickly a hand swings onto a new target: higher is snappier. */
const SWING = 8;
/** Seconds a hand holds steady on a new target before it fires, so each aim is seen to land first. */
const DWELL = 0.3;
/** Seconds between shots, so the dead fall one by one and the street stays full. */
const REST = 0.28;

/**
 * One computer player in the showcase. The director hands it a target,
 * and it swings its aim over like a hand would, with a little tremor,
 * and says when it has held on target long enough to fire.
 */
export class ShowcaseBot {
  aim: ScreenPoint;
  /** What it is after, or null when it has nothing. */
  target: TargetPoint | null = null;
  private steady = 0;
  private rested = REST;

  constructor(
    readonly seat: Seat,
    readonly role: BotRole,
    /** The middle of its patch of screen, where it waits when nothing is in sight. */
    readonly lane: number,
  ) {
    this.aim = { x: lane, y: 0 };
  }

  /** How the planner sees this player. */
  shooter(): Shooter {
    return { seat: this.seat, role: this.role, lane: this.lane, held: this.target?.zombie ?? null };
  }

  /** Moves the aim on by `dt` seconds towards `target`. Returns whether it has settled on it, ready to fire. */
  track(target: TargetPoint | undefined, dt: number, time: number): boolean {
    if (target?.zombie !== this.target?.zombie) this.steady = 0;
    this.target = target ?? null;
    if (!target) return false;
    const k = 1 - Math.exp(-dt * SWING);
    // Two slow waves out of step, so each hand drifts on its own and never quite settles.
    const tremor = 0.012;
    const wx = Math.sin(time * 2.3 + this.seat * 1.7) * tremor + Math.sin(time * 5.1 + this.seat) * tremor * 0.4;
    const wy = Math.sin(time * 1.9 + this.seat * 2.9) * tremor + Math.sin(time * 4.3 + this.seat * 3) * tremor * 0.4;
    this.aim = { x: this.aim.x + (target.x + wx - this.aim.x) * k, y: this.aim.y + (target.y + wy - this.aim.y) * k };
    const on = Math.hypot(this.aim.x - target.x, this.aim.y - target.y) < ON_TARGET;
    this.steady = on ? this.steady + dt : 0;
    this.rested += dt;
    return this.steady >= DWELL && this.rested >= REST;
  }

  /** Starts the rest after a shot. Only a shot that went off counts, so a blocked line does not cost a turn. */
  fired(): void {
    this.rested = 0;
  }
}
